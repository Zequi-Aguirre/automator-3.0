// TICKET-127 — Zoe core AI service
// Natural language → AI API (tool use) → SQL → structured response
// Supports Anthropic (claude-*) and OpenAI (gpt-*, o1-*, o3-*) models
import { injectable } from 'tsyringe';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import crypto from 'crypto';
import { IDatabase } from 'pg-promise';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { DBContainer } from '../config/DBContainer';
import ZoeConfigDAO from '../data/zoeConfigDAO';
import { ZoeResponse, ZoeAskDTO } from '../types/zoeTypes';
import { EnvConfig } from '../config/envConfig';

// ── SQL safety validation ────────────────────────────────────────────────────

const WRITE_PATTERN = /\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP|CREATE|ALTER|GRANT|REVOKE|REPLACE|UPSERT|MERGE)\b/i;
// Credential columns that must never appear in any query result
const SENSITIVE_PATTERN = /\b(encrypted_password|auth_token_encrypted|webhook_url|key_hash)\b|sources\s*\.\s*token/i;

function validateSql(sql: string): { valid: boolean; reason?: string } {
    if (WRITE_PATTERN.test(sql)) {
        return { valid: false, reason: 'Write operations are not allowed. Only SELECT queries are permitted.' };
    }
    if (SENSITIVE_PATTERN.test(sql)) {
        return { valid: false, reason: 'Access to sensitive columns is not permitted.' };
    }
    return { valid: true };
}

function ensureLimit(sql: string): string {
    if (!/\bLIMIT\b/i.test(sql)) {
        return sql.trim().replace(/;?\s*$/, '') + ' LIMIT 200';
    }
    return sql;
}

function isOpenAIModel(model: string): boolean {
    return /^(gpt-|o1-|o3-)/.test(model);
}

// ── ZoeService ───────────────────────────────────────────────────────────────

@injectable()
export default class ZoeService {
    private readonly db: IDatabase<IClient>;
    private anthropicClient: Anthropic | null = null;
    private openaiClient: OpenAI | null = null;

    constructor(
        db: DBContainer,
        private readonly zoeConfigDAO: ZoeConfigDAO,
        private readonly config: EnvConfig,
    ) {
        this.db = db.database();
    }

    private getAnthropicClient(): Anthropic {
        if (!this.anthropicClient) {
            if (!this.config.anthropicApiKey) throw new Error('ANTHROPIC_API_KEY is not configured');
            this.anthropicClient = new Anthropic({ apiKey: this.config.anthropicApiKey });
        }
        return this.anthropicClient;
    }

    private getOpenAIClient(): OpenAI {
        if (!this.openaiClient) {
            if (!this.config.openaiApiKey) throw new Error('OPENAI_API_KEY is not configured');
            this.openaiClient = new OpenAI({ apiKey: this.config.openaiApiKey });
        }
        return this.openaiClient;
    }

    async ask(dto: ZoeAskDTO): Promise<ZoeResponse> {
        const request_id = `zoe_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const generated_at = new Date().toISOString();

        try {
            const [modelConfig, maxTokensConfig, promptConfig] = await Promise.all([
                this.zoeConfigDAO.getByKey('model'),
                this.zoeConfigDAO.getByKey('max_tokens'),
                this.zoeConfigDAO.getByKey('system_prompt'),
            ]);

            const model = modelConfig?.value ?? 'claude-sonnet-4-6';
            const maxTokens = parseInt(maxTokensConfig?.value ?? '4096', 10);
            const systemPrompt = promptConfig?.value ?? 'You are Zoe, a reporting assistant.';

            const { lastSql, lastRows, finalText } = isOpenAIModel(model)
                ? await this.runOpenAILoop(model, maxTokens, systemPrompt, dto.question)
                : await this.runAnthropicLoop(model, maxTokens, systemPrompt, dto.question);

            const text = finalText.trim();

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

    // ── Anthropic agentic loop ────────────────────────────────────────────────

    private async runAnthropicLoop(model: string, maxTokens: number, systemPrompt: string, question: string) {
        const client = this.getAnthropicClient();

        const tools: Anthropic.Tool[] = [{
            name: 'run_query',
            description: 'Execute a read-only SQL SELECT query against the Automator PostgreSQL database. Returns rows as JSON.',
            input_schema: {
                type: 'object' as const,
                properties: {
                    sql: { type: 'string', description: 'The SQL SELECT query to execute. Must be read-only. Max 200 rows returned.' },
                    intent: { type: 'string', description: 'Brief plain-English description of what this query is measuring.' },
                },
                required: ['sql', 'intent'],
            },
        }];

        const messages: Anthropic.MessageParam[] = [{ role: 'user', content: question }];
        let lastSql: string | null = null;
        let lastRows: Record<string, unknown>[] = [];
        let finalText = '';

        for (let turn = 0; turn < 5; turn++) {
            const response = await client.messages.create({ model, max_tokens: maxTokens, system: systemPrompt, tools, messages });

            for (const block of response.content) {
                if (block.type === 'text') finalText += block.text;
            }

            if (response.stop_reason === 'end_turn') break;

            if (response.stop_reason === 'tool_use') {
                const toolResults: Anthropic.ToolResultBlockParam[] = [];

                for (const block of response.content) {
                    if (block.type !== 'tool_use') continue;
                    const input = block.input as { sql: string; intent: string };
                    const validation = validateSql(input.sql);

                    if (!validation.valid) {
                        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `ERROR: ${validation.reason}`, is_error: true });
                        continue;
                    }

                    const safeSql = ensureLimit(input.sql);
                    lastSql = safeSql;

                    try {
                        const rows = await this.db.manyOrNone<Record<string, unknown>>(safeSql);
                        lastRows = rows ?? [];
                        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ rows: lastRows, row_count: lastRows.length }) });
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : 'Query execution failed';
                        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `QUERY ERROR: ${msg}`, is_error: true });
                    }
                }

                messages.push({ role: 'assistant', content: response.content });
                messages.push({ role: 'user', content: toolResults });
                continue;
            }

            break;
        }

        return { lastSql, lastRows, finalText };
    }

    // ── OpenAI agentic loop ───────────────────────────────────────────────────

    private async runOpenAILoop(model: string, maxTokens: number, systemPrompt: string, question: string) {
        const client = this.getOpenAIClient();

        const tools: OpenAI.ChatCompletionTool[] = [{
            type: 'function',
            function: {
                name: 'run_query',
                description: 'Execute a read-only SQL SELECT query against the Automator PostgreSQL database. Returns rows as JSON.',
                parameters: {
                    type: 'object',
                    properties: {
                        sql: { type: 'string', description: 'The SQL SELECT query to execute. Must be read-only. Max 200 rows returned.' },
                        intent: { type: 'string', description: 'Brief plain-English description of what this query is measuring.' },
                    },
                    required: ['sql', 'intent'],
                },
            },
        }];

        const messages: OpenAI.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question },
        ];

        let lastSql: string | null = null;
        let lastRows: Record<string, unknown>[] = [];
        let finalText = '';

        for (let turn = 0; turn < 5; turn++) {
            const response = await client.chat.completions.create({ model, max_tokens: maxTokens, tools, messages });
            const choice = response.choices[0];

            if (choice.finish_reason === 'stop') {
                finalText = choice.message.content ?? '';
                break;
            }

            if (choice.finish_reason === 'tool_calls') {
                const toolCalls = choice.message.tool_calls ?? [];
                messages.push(choice.message);

                for (const toolCall of toolCalls) {
                    if (toolCall.type !== 'function') continue;
                    const args = JSON.parse(toolCall.function.arguments) as { sql: string; intent: string };
                    const validation = validateSql(args.sql);

                    if (!validation.valid) {
                        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: `ERROR: ${validation.reason}` });
                        continue;
                    }

                    const safeSql = ensureLimit(args.sql);
                    lastSql = safeSql;

                    try {
                        const rows = await this.db.manyOrNone<Record<string, unknown>>(safeSql);
                        lastRows = rows ?? [];
                        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify({ rows: lastRows, row_count: lastRows.length }) });
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : 'Query execution failed';
                        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: `QUERY ERROR: ${msg}` });
                    }
                }

                continue;
            }

            break;
        }

        return { lastSql, lastRows, finalText };
    }
}
