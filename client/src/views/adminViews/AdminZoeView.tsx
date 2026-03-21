// TICKET-130, TICKET-131 — Zoe AI management page (superadmin only)
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    ListSubheader,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import zoeService, { ZoeApiKey, ZoeApiKeyCreateResult, ZoeConfig } from '../../services/zoe.service';

const MODELS = {
    Anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    OpenAI: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
};

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
}

// ── API Keys section ──────────────────────────────────────────────────────────

function ApiKeysSection() {
    const [keys, setKeys] = useState<ZoeApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [creating, setCreating] = useState(false);
    const [newKeyResult, setNewKeyResult] = useState<ZoeApiKeyCreateResult | null>(null);
    const [copied, setCopied] = useState(false);
    const [revoking, setRevoking] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try { setKeys(await zoeService.getKeys()); } finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const handleCreate = async () => {
        if (!newKeyName.trim()) return;
        setCreating(true);
        try {
            const result = await zoeService.createKey(newKeyName.trim());
            setNewKeyResult(result);
            setNewKeyName('');
            await load();
        } finally { setCreating(false); }
    };

    const handleRevoke = async (id: string) => {
        if (!confirm('Revoke this API key? This cannot be undone.')) return;
        setRevoking(id);
        try { await zoeService.revokeKey(id); await load(); } finally { setRevoking(null); }
    };

    const handleCopy = () => {
        if (!newKeyResult) return;
        void navigator.clipboard.writeText(newKeyResult.plaintext_key);
        setCopied(true);
        setTimeout(() => { setCopied(false); }, 2000);
    };

    const activeKeys = keys.filter(k => k.active);
    const revokedKeys = keys.filter(k => !k.active);

    return (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight={700}>API Keys</Typography>
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => { setCreateOpen(true); }}>
                    Create Key
                </Button>
            </Stack>

            {loading
? (
                <CircularProgress size={24} />
            )
: activeKeys.length === 0
? (
                <Typography color="text.secondary" fontSize={14}>No active keys. Create one to connect your Custom GPT.</Typography>
            )
: (
                <Stack spacing={1}>
                    {activeKeys.map(key => (
                        <Box key={key.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography fontWeight={600} fontSize={14}>{key.name}</Typography>
                                    <Typography fontSize={12} color="text.secondary">
                                        Created {formatDate(key.created)}
                                        {key.last_used_at ? ` · Last used ${formatDate(key.last_used_at)}` : ' · Never used'}
                                    </Typography>
                                </Box>
                                <Tooltip title="Revoke key">
                                    <span>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            disabled={revoking === key.id}
                                            onClick={() => { void handleRevoke(key.id); }}
                                        >
                                            {revoking === key.id ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Stack>
                        </Box>
                    ))}
                </Stack>
            )}

            {revokedKeys.length > 0 && (
                <Box mt={2}>
                    <Typography fontSize={12} color="text.secondary" mb={1}>Revoked keys</Typography>
                    <Stack spacing={0.5}>
                        {revokedKeys.map(key => (
                            <Stack key={key.id} direction="row" alignItems="center" gap={1}>
                                <Typography fontSize={13} color="text.disabled" sx={{ textDecoration: 'line-through' }}>{key.name}</Typography>
                                <Chip label="revoked" size="small" color="default" />
                                <Typography fontSize={12} color="text.disabled">{formatDate(key.revoked_at)}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>
            )}

            {/* Create dialog */}
            <Dialog open={createOpen} onClose={() => { if (!creating && !newKeyResult) setCreateOpen(false); }} maxWidth="sm" fullWidth>
                <DialogTitle>{newKeyResult ? 'Key Created — Save It Now' : 'Create API Key'}</DialogTitle>
                <DialogContent>
                    {newKeyResult
? (
                        <Box>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                This key will only be shown once. Copy it now and store it safely.
                            </Alert>
                            <Box sx={{ bgcolor: 'grey.100', borderRadius: 1, p: 1.5, fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all', mb: 1 }}>
                                {newKeyResult.plaintext_key}
                            </Box>
                            <Button
                                startIcon={<ContentCopyIcon />}
                                variant={copied ? 'contained' : 'outlined'}
                                color={copied ? 'success' : 'primary'}
                                onClick={handleCopy}
                                size="small"
                            >
                                {copied ? 'Copied!' : 'Copy to clipboard'}
                            </Button>
                        </Box>
                    )
: (
                        <TextField
                            autoFocus
                            fullWidth
                            label="Key name"
                            placeholder="e.g. Custom GPT - Production"
                            value={newKeyName}
                            onChange={e => { setNewKeyName(e.target.value); }}
                            onKeyDown={e => { if (e.key === 'Enter') void handleCreate(); }}
                            sx={{ mt: 1 }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    {newKeyResult
? (
                        <Button onClick={() => { setNewKeyResult(null); setCreateOpen(false); }} variant="contained">Done</Button>
                    )
: (
                        <>
                            <Button onClick={() => { setCreateOpen(false); }} disabled={creating}>Cancel</Button>
                            <Button onClick={() => { void handleCreate(); }} variant="contained" disabled={creating || !newKeyName.trim()}>
                                {creating ? <CircularProgress size={18} /> : 'Create'}
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ── Config section ────────────────────────────────────────────────────────────

function ConfigSection() {
    const [configs, setConfigs] = useState<ZoeConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [localValues, setLocalValues] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState<Record<string, boolean>>({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const c = await zoeService.getConfig();
            setConfigs(c);
            const vals: Record<string, string> = {};
            c.forEach(cfg => { vals[cfg.key] = cfg.value; });
            setLocalValues(vals);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const handleSave = async (key: string) => {
        setSaving(key);
        try {
            await zoeService.updateConfig(key, localValues[key] ?? '');
            setSaved(prev => ({ ...prev, [key]: true }));
            setTimeout(() => { setSaved(prev => ({ ...prev, [key]: false })); }, 2000);
        } finally { setSaving(null); }
    };

    if (loading) return <CircularProgress size={24} />;

    const promptConfig = configs.find(c => c.key === 'system_prompt');
    const modelConfig = configs.find(c => c.key === 'model');
    const maxTokensConfig = configs.find(c => c.key === 'max_tokens');

    return (
        <Stack spacing={3}>
            {/* Model */}
            {modelConfig && (
                <Box>
                    <Typography fontWeight={600} fontSize={14} mb={0.5}>Model</Typography>
                    <Typography fontSize={12} color="text.secondary" mb={1}>{modelConfig.description}</Typography>
                    <Stack direction="row" alignItems="center" gap={1}>
                        <Select
                            size="small"
                            value={localValues.model ?? modelConfig.value}
                            onChange={e => { setLocalValues(prev => ({ ...prev, model: e.target.value })); }}
                            sx={{ minWidth: 280 }}
                        >
                            {Object.entries(MODELS).flatMap(([provider, models]) => [
                                <ListSubheader key={provider}>{provider}</ListSubheader>,
                                ...models.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>),
                            ])}
                        </Select>
                        <Button
                            variant={saved.model ? 'contained' : 'outlined'}
                            color={saved.model ? 'success' : 'primary'}
                            size="small"
                            startIcon={saving === 'model' ? <CircularProgress size={14} /> : <SaveIcon />}
                            disabled={saving === 'model'}
                            onClick={() => { void handleSave('model'); }}
                        >
                            {saved.model ? 'Saved' : 'Save'}
                        </Button>
                    </Stack>
                </Box>
            )}

            {/* Max tokens */}
            {maxTokensConfig && (
                <Box>
                    <Typography fontWeight={600} fontSize={14} mb={0.5}>Max Tokens</Typography>
                    <Typography fontSize={12} color="text.secondary" mb={1}>{maxTokensConfig.description}</Typography>
                    <Stack direction="row" alignItems="center" gap={1}>
                        <TextField
                            size="small"
                            type="number"
                            value={localValues.max_tokens ?? maxTokensConfig.value}
                            onChange={e => { setLocalValues(prev => ({ ...prev, max_tokens: e.target.value })); }}
                            sx={{ width: 140 }}
                            inputProps={{ min: 256, max: 16000 }}
                        />
                        <Button
                            variant={saved.max_tokens ? 'contained' : 'outlined'}
                            color={saved.max_tokens ? 'success' : 'primary'}
                            size="small"
                            startIcon={saving === 'max_tokens' ? <CircularProgress size={14} /> : <SaveIcon />}
                            disabled={saving === 'max_tokens'}
                            onClick={() => { void handleSave('max_tokens'); }}
                        >
                            {saved.max_tokens ? 'Saved' : 'Save'}
                        </Button>
                    </Stack>
                </Box>
            )}

            {/* System prompt */}
            {promptConfig && (
                <Box>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                        <Typography fontWeight={600} fontSize={14}>System Prompt</Typography>
                        <Button
                            variant={saved.system_prompt ? 'contained' : 'outlined'}
                            color={saved.system_prompt ? 'success' : 'primary'}
                            size="small"
                            startIcon={saving === 'system_prompt' ? <CircularProgress size={14} /> : <SaveIcon />}
                            disabled={saving === 'system_prompt'}
                            onClick={() => { void handleSave('system_prompt'); }}
                        >
                            {saved.system_prompt ? 'Saved' : 'Save'}
                        </Button>
                    </Stack>
                    <Typography fontSize={12} color="text.secondary" mb={1}>{promptConfig.description}</Typography>
                    <TextField
                        multiline
                        fullWidth
                        minRows={14}
                        maxRows={40}
                        value={localValues.system_prompt ?? promptConfig.value}
                        onChange={e => { setLocalValues(prev => ({ ...prev, system_prompt: e.target.value })); }}
                        inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
                    />
                    {promptConfig.updated_by_name && (
                        <Typography fontSize={11} color="text.disabled" mt={0.5}>
                            Last updated by {promptConfig.updated_by_name} at {formatDate(promptConfig.updated_at)}
                        </Typography>
                    )}
                </Box>
            )}
        </Stack>
    );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function AdminZoeView() {
    return (
        <Container maxWidth="md" sx={{ py: 3 }}>
            <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
                <Typography variant="h5" fontWeight={700}>Zoe</Typography>
                <Chip label="AI Reporting" size="small" color="primary" variant="outlined" />
                <Chip label="superadmin only" size="small" variant="outlined" />
            </Stack>

            <ApiKeysSection />

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" fontWeight={700} mb={2}>Agent Configuration</Typography>
            <ConfigSection />
        </Container>
    );
}
