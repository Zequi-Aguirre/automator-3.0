// TICKET-140: Platform connections admin view
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import WifiIcon from '@mui/icons-material/Wifi';
import { useEffect, useState } from 'react';
import platformConnectionService from '../../services/platformConnection.service';
import { PlatformConnection, PlatformConnectionCreateDTO, PlatformConnectionUpdateDTO } from '../../types/platformConnectionTypes';

type FormState = {
    label: string;
    host: string;
    port: string;
    dbname: string;
    db_username: string;
    password: string;
    lookback_days: string;
};

const EMPTY_FORM: FormState = {
    label: '',
    host: '',
    port: '5432',
    dbname: '',
    db_username: '',
    password: '',
    lookback_days: '30',
};

export default function AdminPlatformConnectionsView() {
    const [connections, setConnections] = useState<PlatformConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [testingId, setTestingId] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{ id: string; ok: boolean; message: string } | null>(null);

    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            setConnections(await platformConnectionService.getAll());
        } catch {
            setError('Failed to load platform connections');
        } finally {
            setLoading(false);
        }
    }

    function openAdd() {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError(null);
        setDialogOpen(true);
    }

    function openEdit(conn: PlatformConnection) {
        setEditingId(conn.id);
        setForm({
            label: conn.label ?? '',
            host: conn.host,
            port: String(conn.port),
            dbname: conn.dbname,
            db_username: conn.db_username,
            password: '', // never pre-fill password
            lookback_days: String(conn.lookback_days),
        });
        setFormError(null);
        setDialogOpen(true);
    }

    async function handleSave() {
        setFormError(null);
        if (!form.host || !form.dbname || !form.db_username) {
            setFormError('Host, database name, and username are required');
            return;
        }
        if (!editingId && !form.password) {
            setFormError('Password is required');
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                const dto: PlatformConnectionUpdateDTO = {
                    label: form.label || null,
                    host: form.host,
                    port: Number(form.port),
                    dbname: form.dbname,
                    db_username: form.db_username,
                    lookback_days: Number(form.lookback_days),
                };
                if (form.password) dto.password = form.password;
                const updated = await platformConnectionService.update(editingId, dto);
                setConnections(prev => prev.map(c => c.id === editingId ? updated : c));
            } else {
                const dto: PlatformConnectionCreateDTO = {
                    label: form.label || undefined,
                    host: form.host,
                    port: Number(form.port),
                    dbname: form.dbname,
                    db_username: form.db_username,
                    password: form.password,
                    lookback_days: Number(form.lookback_days),
                };
                const created = await platformConnectionService.create(dto);
                setConnections(prev => [...prev, created]);
            }
            setDialogOpen(false);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    }

    async function handleToggleActive(conn: PlatformConnection) {
        try {
            const updated = await platformConnectionService.update(conn.id, { is_active: !conn.is_active });
            setConnections(prev => prev.map(c => c.id === conn.id ? updated : c));
        } catch {
            setError('Failed to update connection');
        }
    }

    async function handleTest(conn: PlatformConnection) {
        setTestingId(conn.id);
        setTestResult(null);
        try {
            const result = await platformConnectionService.testConnection(conn.id);
            setTestResult({ id: conn.id, ...result });
        } catch {
            setTestResult({ id: conn.id, ok: false, message: 'Test failed unexpectedly' });
        } finally {
            setTestingId(null);
        }
    }

    async function handleDelete(id: string) {
        setDeletingId(id);
        try {
            await platformConnectionService.delete(id);
            setConnections(prev => prev.filter(c => c.id !== id));
        } catch {
            setError('Failed to delete connection');
        } finally {
            setDeletingId(null);
        }
    }

    function field(key: keyof FormState, label: string, opts?: { type?: string; required?: boolean; helperText?: string }) {
        return (
            <TextField
                key={key}
                label={label}
                type={opts?.type ?? 'text'}
                size="small"
                fullWidth
                required={opts?.required}
                value={form[key]}
                helperText={opts?.helperText}
                onChange={e => { setForm(prev => ({ ...prev, [key]: e.target.value })); }}
            />
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5" fontWeight={600}>Platform Connections</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
                    Add Connection
                </Button>
            </Box>

            {error && <Alert severity="error" onClose={() => { setError(null); }} sx={{ mb: 2 }}>{error}</Alert>}

            {loading
                ? <CircularProgress />
                : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Label</TableCell>
                                <TableCell>Host / DB</TableCell>
                                <TableCell>Lookback</TableCell>
                                <TableCell>Last Synced</TableCell>
                                <TableCell>Active</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {connections.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                                        No platform connections configured
                                    </TableCell>
                                </TableRow>
                            )}
                            {connections.map(conn => (
                                <TableRow key={conn.id}>
                                    <TableCell>{conn.label ?? <span style={{ color: '#aaa' }}>—</span>}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{conn.host}:{conn.port}</Typography>
                                        <Typography variant="caption" color="text.secondary">{conn.dbname} / {conn.db_username}</Typography>
                                        {testResult?.id === conn.id && (
                                            <Chip
                                                size="small"
                                                label={testResult.message}
                                                color={testResult.ok ? 'success' : 'error'}
                                                sx={{ ml: 1 }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>{conn.lookback_days}d</TableCell>
                                    <TableCell>
                                        {conn.last_synced_at
                                            ? new Date(conn.last_synced_at).toLocaleString()
                                            : <span style={{ color: '#aaa' }}>Never</span>}
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            size="small"
                                            checked={conn.is_active}
                                            onChange={async () => { await handleToggleActive(conn); }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Test connection">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={async () => { await handleTest(conn); }}
                                                    disabled={testingId === conn.id}
                                                >
                                                    {testingId === conn.id
                                                        ? <CircularProgress size={16} />
                                                        : <WifiIcon fontSize="small" />}
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title="Edit">
                                            <IconButton size="small" onClick={() => { openEdit(conn); }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={async () => { await handleDelete(conn.id); }}
                                                    disabled={deletingId === conn.id}
                                                >
                                                    {deletingId === conn.id
                                                        ? <CircularProgress size={16} />
                                                        : <DeleteIcon fontSize="small" />}
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Add / Edit dialog */}
            <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); }} maxWidth="sm" fullWidth>
                <DialogTitle>{editingId ? 'Edit Connection' : 'Add Platform Connection'}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
                    {field('label', 'Label (optional)', { helperText: 'e.g. "Northstar Production"' })}
                    {field('host', 'Host', { required: true })}
                    {field('port', 'Port')}
                    {field('dbname', 'Database name', { required: true })}
                    {field('db_username', 'Username', { required: true })}
                    {field('password', editingId ? 'Password (leave blank to keep current)' : 'Password', { type: 'password', required: !editingId })}
                    {field('lookback_days', 'Lookback days', { helperText: 'How many days back to sync on each run' })}
                    {formError && <Alert severity="error">{formError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setDialogOpen(false); }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? <CircularProgress size={18} /> : editingId ? 'Save' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
