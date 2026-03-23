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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import WifiIcon from '@mui/icons-material/Wifi';
import { useEffect, useState } from 'react';
import platformConnectionService from '../../services/platformConnection.service';
import buyerService from '../../services/buyer.service';
import { PlatformConnection, PlatformConnectionCreateDTO, PlatformConnectionUpdateDTO } from '../../types/platformConnectionTypes';
import { Buyer } from '../../types/buyerTypes';

type FormState = {
    automator_buyer_id: string;
    northstar_buyer_id: string;
    label: string;
    host: string;
    port: string;
    dbname: string;
    db_username: string;
    password: string;
    lookback_days: string;
};

const EMPTY_FORM: FormState = {
    automator_buyer_id: '',
    northstar_buyer_id: '',
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
    const [buyers, setBuyers] = useState<Buyer[]>([]);
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

    useEffect(() => {
        load();
        buyerService.getAll({ page: 1, limit: 200 }).then(r => { setBuyers(r.items); }).catch(() => {});
    }, []);

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
            automator_buyer_id: conn.automator_buyer_id,
            northstar_buyer_id: conn.northstar_buyer_id,
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
        if (!form.host || !form.dbname || !form.db_username || !form.northstar_buyer_id) {
            setFormError('Host, database, username, and Northstar Buyer ID are required');
            return;
        }
        if (!editingId && !form.password) {
            setFormError('Password is required');
            return;
        }
        if (!editingId && !form.automator_buyer_id) {
            setFormError('Buyer is required');
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                const dto: PlatformConnectionUpdateDTO = {
                    northstar_buyer_id: form.northstar_buyer_id,
                    label: form.label || null,
                    host: form.host,
                    port: Number(form.port),
                    dbname: form.dbname,
                    db_username: form.db_username,
                    lookback_days: Number(form.lookback_days),
                };
                if (form.password) dto.password = form.password;
                const updated = await platformConnectionService.update(editingId, dto);
                setConnections(prev => prev.map(c => c.id === editingId ? { ...c, ...updated } : c));
            } else {
                const dto: PlatformConnectionCreateDTO = {
                    automator_buyer_id: form.automator_buyer_id,
                    northstar_buyer_id: form.northstar_buyer_id,
                    label: form.label || undefined,
                    host: form.host,
                    port: Number(form.port),
                    dbname: form.dbname,
                    db_username: form.db_username,
                    password: form.password,
                    lookback_days: Number(form.lookback_days),
                };
                const created = await platformConnectionService.create(dto);
                setConnections(prev => [...prev, { ...created, buyer_name: buyers.find(b => b.id === created.automator_buyer_id)?.name ?? '' }]);
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
            setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, ...updated } : c));
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
                                <TableCell>Buyer</TableCell>
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
                                    <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                                        No platform connections configured
                                    </TableCell>
                                </TableRow>
                            )}
                            {connections.map(conn => (
                                <TableRow key={conn.id}>
                                    <TableCell>{conn.buyer_name}</TableCell>
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
                    {!editingId && (
                        <FormControl size="small" fullWidth required>
                            <InputLabel>Buyer</InputLabel>
                            <Select
                                value={form.automator_buyer_id}
                                label="Buyer"
                                onChange={e => { setForm(prev => ({ ...prev, automator_buyer_id: e.target.value })); }}
                            >
                                {buyers.map(b => (
                                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    {field('northstar_buyer_id', 'Northstar Buyer ID (UUID)', { required: true, helperText: 'The u.id of this buyer in the Northstar database' })}
                    {field('label', 'Label (optional)', { helperText: 'e.g. "SellersDirect - Buyer A"' })}
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
