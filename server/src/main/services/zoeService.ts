// TICKET-127 — Zoe core AI service
// Natural language → Claude API (tool use) → SQL → structured response
import { injectable } from 'tsyringe';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { IDatabase } from 'pg-promise';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { DBContainer } from '../config/DBContainer';
import ZoeConfigDAO from '../data/zoeConfigDAO';
import { ZoeResponse, ZoeAskDTO } from '../types/zoeTypes';
import { EnvConfig } from '../config/envConfig';

// ── SQL safety validation ────────────────────────────────────────────────────

const WRITE_PATTERN = /\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP|CREATE|ALTER|GRANT|REVOKE|REPLACE|UPSERT|MERGE)\b/i;
const SENSITIVE_PATTERN = /\b(encrypted_password|auth_token_encrypted|webhook_url|sources\.token)\b/i;
const APPROVED_TABLES = new Set([
    'leads', 'send_log', 'lead_buyer_outcomes', 'sources', 'campaigns',
    'buyers', 'counties', 'lead_managers', 'activity_log',
    'trash_reasons', 'call_outcomes', 'call_request_reasons',
]);

function validateSql(sql: string): { valid: boolean; reason?: string } {
    if (WRITE_PATTERN.test(sql)) {
        return { valid: false, reason: 'Write operations are not allowed. Only SELECT queries are permitted.' };
    }
    if (SENSITIVE_PATTERN.test(sql)) {
        return { valid: false, reason: 'Access to sensitive columns is not permitted.' };
    }
    // Check for any table not in approved list — simple heuristic via FROM/JOIN
    const tableMatches = sql.match(/(?:FROM|JOIN)\s+(\w+)/gi) ?? [];
    for (const match of tableMatches) {
        const table = match.replace(/^(FROM|JOIN)\s+/i, '').toLowerCase();
        if (!APPROVED_TABLES.has(table)) {
            return { valid: false, reason: `Table "${table}" is not in the approved list.` };
        }
    }
    return { valid: true };
}

function ensureLimit(sql: string): string {
    if (!/\bLIMIT\b/i.test(sql)) {
        return sql.trim().replace(/;?\s*$/, '') + ' LIMIT 200';
    }
    return sql;
}

// ── ZoeService ───────────────────────────────────────────────────────────────

@injectable()
export default class ZoeService {
    private readonly db: IDatabase<IClient>;
    private client: Anthropic | null = null;

    constructor(
        db: DBContainer,
        private readonly zoeConfigDAO: ZoeConfigDAO,
        private readonly config: EnvConfig,
    ) {
        this.db = db.database();
    }

    private getClient(): Anthropic {
        if (!this.client) {
            if (!this.config.anthropicApiKey) {
                throw new Error('ANTHROPIC_API_KEY is not configured');
            }
            this.client = new Anthropic({ apiKey: this.config.anthropicApiKey });
        }
        return this.client;
    }

    async ask(dto: ZoeAskDTO): Promise<ZoeResponse> {
        const request_id = `zoe_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const generated_at = new Date().toISOString();

        try {
            // Load config from DB
            const [modelConfig, maxTokensConfig, promptConfig] = await Promise.all([
                this.zoeConfigDAO.getByKey('model'),
                this.zoeConfigDAO.getByKey('max_tokens'),
                this.zoeConfigDAO.getByKey('system_prompt'),
            ]);

            const model = modelConfig?.value ?? 'claude-sonnet-4-6';
            const maxTokens = parseInt(maxTokensConfig?.value ?? '4096', 10);
            const systemPrompt = promptConfig?.value ?? 'You are Zoe, a reporting assistant.';

            const client = this.getClient();

            // ── Tool definition ──────────────────────────────────────────────
            const tools: Anthropic.Tool[] = [{
                name: 'run_query',
                description: 'Execute a read-only SQL SELECT query against the Automator PostgreSQL database. Returns rows as JSON. Use this to answer any business data question.',
                input_schema: {
                    type: 'object' as const,
                    properties: {
                        sql: {
                            type: 'string',
                            description: 'The SQL SELECT query to execute. Must be read-only. Max 200 rows returned.',
                        },
                        intent: {
                            type: 'string',
                            description: 'Brief plain-English description of what this query is measuring.',
                        },
                    },
                    required: ['sql', 'intent'],
                },
            }];

            // ── Agentic loop ─────────────────────────────────────────────────
            const messages: Anthropic.MessageParam[] = [
                { role: 'user', content: dto.question },
            ];

            let lastSql: string | null = null;
            let lastRows: Record<string, unknown>[] = [];
            let finalText = '';

            for (let turn = 0; turn < 5; turn++) {
                const response = await client.messages.create({
                    model,
                    max_tokens: maxTokens,
                    system: systemPrompt,
                    tools,
                    messages,
                });

                // Collect text from this response
                for (const block of response.content) {
                    if (block.type === 'text') {
                        finalText += block.text;
                    }
                }

                if (response.stop_reason === 'end_turn') break;

                if (response.stop_reason === 'tool_use') {
                    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
                    const toolResults: Anthropic.ToolResultBlockParam[] = [];

                    for (const block of toolUseBlocks) {
                        if (block.type !== 'tool_use') continue;

                        const input = block.input as { sql: string; intent: string };
                        const rawSql = input.sql;

                        const validation = validateSql(rawSql);
                        if (!validation.valid) {
                            toolResults.push({
                                type: 'tool_result',
                                tool_use_id: block.id,
                                content: `ERROR: ${validation.reason}`,
                                is_error: true,
                            });
                            continue;
                        }

                        const safeSql = ensureLimit(rawSql);
                        lastSql = safeSql;

                        try {
                            const rows = await this.db.manyOrNone<Record<string, unknown>>(safeSql);
                            lastRows = rows ?? [];
                            toolResults.push({
                                type: 'tool_result',
                                tool_use_id: block.id,
                                content: JSON.stringify({ rows: lastRows, row_count: lastRows.length }),
                            });
                        } catch (err) {
                            const msg = err instanceof Error ? err.message : 'Query execution failed';
                            toolResults.push({
                                type: 'tool_result',
                                tool_use_id: block.id,
                                content: `QUERY ERROR: ${msg}`,
                                is_error: true,
                            });
                        }
                    }

                    // Feed tool results back for next turn
                    messages.push({ role: 'assistant', content: response.content });
                    messages.push({ role: 'user', content: toolResults });
                    continue;
                }

                break;
            }

            // ── Build response ───────────────────────────────────────────────
            const text = finalText.trim();

            // Detect clarification responses
            if (!lastSql && text.length > 0) {
                return {
                    request_id,
                    status: 'needs_clarification',
                    user_question: dto.question,
                    summary: null,
                    table: null,
                    sql_executed: null,
                    row_count: null,
                    caveats: [],
                    clarification_question: text,
                    generated_at,
                };
            }

            return {
                request_id,
                status: 'completed',
                user_question: dto.question,
                summary: text,
                table: lastRows.length > 0 ? lastRows : null,
                sql_executed: lastSql,
                row_count: lastRows.length,
                caveats: [],
                clarification_question: null,
                generated_at,
            };

        } catch (err) {
            console.error('[ZoeService] error:', err);
            return {
                request_id,
                status: 'failed',
                user_question: dto.question,
                summary: null,
                table: null,
                sql_executed: null,
                row_count: null,
                caveats: [],
                clarification_question: null,
                generated_at,
            };
        }
    }
}
