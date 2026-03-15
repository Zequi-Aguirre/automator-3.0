import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Alert,
    Stack,
    Switch,
    TextField,
    Typography,
    Checkbox,
} from '@mui/material';
import { ArrowBack, Edit, Save, Cancel, Delete } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

import buyerService from '../../services/buyer.service';
import { Buyer, BuyerUpdateDTO } from '../../types/buyerTypes';
import { US_STATES } from '../../constants/usStates';

const AdminBuyerDetailsView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [buyer, setBuyer] = useState<Buyer | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<BuyerUpdateDTO>({});
    const [showStates, setShowStates] = useState(false);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

    const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const fetchBuyer = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await buyerService.getById(id);
            setBuyer(data);
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to load buyer: ${msg}`, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBuyer(); }, [id]);

    const handleEdit = () => {
        if (!buyer) return;
        setShowStates((buyer.states_on_hold || []).length > 0);
        setForm({
            name: buyer.name,
            webhook_url: buyer.webhook_url,
            priority: buyer.priority,
            auto_send: buyer.auto_send,
            manual_send: buyer.manual_send,
            worker_send: buyer.worker_send,
            allow_resell: buyer.allow_resell,
            requires_validation: buyer.requires_validation,
            min_minutes_between_sends: buyer.min_minutes_between_sends,
            max_minutes_between_sends: buyer.max_minutes_between_sends,
            auth_header_name: buyer.auth_header_name,
            auth_header_prefix: buyer.auth_header_prefix,
            auth_token: null,
            states_on_hold: buyer.states_on_hold || [],
            delay_same_county: buyer.delay_same_county,
            delay_same_state: buyer.delay_same_state,
            enforce_county_cooldown: buyer.enforce_county_cooldown,
            enforce_state_cooldown: buyer.enforce_state_cooldown,
            payload_format: buyer.payload_format,
        });
        setEditMode(true);
    };

    const handleCancel = () => {
        setEditMode(false);
        setForm({});
    };

    const handleSave = async () => {
        if (!id) return;
        setSaving(true);
        try {
            const updateData = { ...form };
            if (!updateData.auth_token) delete updateData.auth_token;
            const updated = await buyerService.update(id, updateData);
            setBuyer(updated);
            setEditMode(false);
            setForm({});
            setSnack({ open: true, message: 'Buyer updated', severity: 'success' });
        } catch (error: any) {
            const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to update: ${msg}`, severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id || !confirm('Delete this buyer?')) return;
        try {
            await buyerService.delete(id);
            navigate('/buyers');
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to delete: ${msg}`, severity: 'error' });
        }
    };

    const handleSaveNextSend = async () => {
        if (!id || !selectedDate) return;
        try {
            const updated = await buyerService.update(id, { next_send_at: selectedDate.toISOString() });
            setBuyer(updated);
            setDatePickerOpen(false);
            setSnack({ open: true, message: 'Next send time updated', severity: 'success' });
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to update: ${msg}`, severity: 'error' });
        }
    };

    const f = form as any;

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!buyer) {
        return (
            <Box sx={{ p: 4 }}>
                <Typography variant="h5">Buyer not found</Typography>
                <Button onClick={() => navigate('/buyers')} sx={{ mt: 2 }}>Back to Buyers</Button>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 4, overflow: 'auto', height: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={() => navigate('/buyers')}><ArrowBack /></IconButton>
                <Typography variant="h5" sx={{ fontWeight: 600, flexGrow: 1 }}>{buyer.name}</Typography>
                <Chip label={`Priority ${buyer.priority}`} variant="outlined" size="small" />
                <Button size="small" variant="outlined" color="error" startIcon={<Delete />} onClick={handleDelete}>Delete</Button>
            </Box>

            {/* Configuration Card */}
            <Card variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600}>Configuration</Typography>
                        {editMode ? (
                            <Stack direction="row" spacing={1}>
                                <Button size="small" variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}>Save</Button>
                                <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={handleCancel}>Cancel</Button>
                            </Stack>
                        ) : (
                            <Button size="small" variant="outlined" startIcon={<Edit />} onClick={handleEdit}>Edit</Button>
                        )}
                    </Box>

                    {editMode ? (
                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField size="small" fullWidth label="Name" value={f.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                <TextField size="small" sx={{ width: 120 }} label="Priority" type="number" value={f.priority ?? ''} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })} />
                            </Box>
                            <TextField size="small" fullWidth label="Webhook URL" value={f.webhook_url || ''} onChange={(e) => setForm({ ...form, webhook_url: e.target.value })} />

                            {/* Dispatch Mode */}
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Dispatch Mode</Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <FormControlLabel
                                        control={<Checkbox size="small" checked={!!f.auto_send} onChange={(e) => setForm({ ...form, auto_send: e.target.checked })} />}
                                        label={<Typography variant="body2">Auto Send</Typography>}
                                    />
                                    <FormControlLabel
                                        control={<Checkbox size="small" checked={f.manual_send !== false} onChange={(e) => setForm({ ...form, manual_send: e.target.checked })} />}
                                        label={<Typography variant="body2">Manual</Typography>}
                                    />
                                    <FormControlLabel
                                        control={<Checkbox size="small" checked={f.worker_send !== false} onChange={(e) => setForm({ ...form, worker_send: e.target.checked })} />}
                                        label={<Typography variant="body2">Worker</Typography>}
                                    />
                                </Box>
                            </Box>

                            <FormControl size="small" fullWidth>
                                <InputLabel>Payload Format</InputLabel>
                                <Select value={f.payload_format ?? 'default'} label="Payload Format" onChange={(e) => setForm({ ...form, payload_format: e.target.value as 'default' | 'northstar' })}>
                                    <MenuItem value="default">Default</MenuItem>
                                    <MenuItem value="northstar">Northstar (Compass / SellersDirect)</MenuItem>
                                </Select>
                            </FormControl>

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField size="small" fullWidth label="Min Min Between Sends" type="number" value={f.min_minutes_between_sends ?? 4} onChange={(e) => setForm({ ...form, min_minutes_between_sends: parseInt(e.target.value) })} />
                                <TextField size="small" fullWidth label="Max Min Between Sends" type="number" value={f.max_minutes_between_sends ?? 11} onChange={(e) => setForm({ ...form, max_minutes_between_sends: parseInt(e.target.value) })} />
                            </Box>

                            <FormControlLabel
                                control={<Switch size="small" checked={!!f.allow_resell} onChange={(e) => setForm({ ...form, allow_resell: e.target.checked })} />}
                                label={<Typography variant="body2">Allow Resell</Typography>}
                            />

                            <FormControlLabel
                                control={<Switch size="small" checked={!!f.requires_validation} onChange={(e) => setForm({ ...form, requires_validation: e.target.checked })} />}
                                label={<Typography variant="body2">Requires Validation</Typography>}
                            />

                            {/* States on Hold toggle + collapse */}
                            <Box>
                                <FormControlLabel
                                    control={<Switch size="small" checked={showStates} onChange={(e) => {
                                        setShowStates(e.target.checked);
                                        if (!e.target.checked) setForm({ ...form, states_on_hold: [] });
                                    }} />}
                                    label={<Typography variant="body2">
                                        States on Hold {(f.states_on_hold?.length ?? 0) > 0 && <Chip label={f.states_on_hold.length} size="small" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }} />}
                                    </Typography>}
                                />
                                {showStates && (
                                    <TextField
                                        select
                                        size="small"
                                        fullWidth
                                        label="States on Hold"
                                        SelectProps={{ multiple: true, value: f.states_on_hold || [] }}
                                        onChange={(e) => setForm({ ...form, states_on_hold: e.target.value as any })}
                                        sx={{ mt: 1 }}
                                    >
                                        {US_STATES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                    </TextField>
                                )}
                            </Box>

                            <FormControlLabel
                                control={<Switch size="small" checked={!!f.enforce_county_cooldown} onChange={(e) => setForm({ ...form, enforce_county_cooldown: e.target.checked })} />}
                                label={<Typography variant="body2">Enforce County Cooldown</Typography>}
                            />
                            {f.enforce_county_cooldown && (
                                <TextField size="small" fullWidth label="County Cooldown (hours)" type="number" value={f.delay_same_county ?? 36} onChange={(e) => setForm({ ...form, delay_same_county: parseInt(e.target.value) })} />
                            )}

                            <FormControlLabel
                                control={<Switch size="small" checked={!!f.enforce_state_cooldown} onChange={(e) => setForm({ ...form, enforce_state_cooldown: e.target.checked })} />}
                                label={<Typography variant="body2">Enforce State Cooldown</Typography>}
                            />
                            {f.enforce_state_cooldown && (
                                <TextField size="small" fullWidth label="State Cooldown (hours)" type="number" value={f.delay_same_state ?? 0} onChange={(e) => setForm({ ...form, delay_same_state: parseInt(e.target.value) })} />
                            )}

                            <TextField size="small" fullWidth label="Auth Header Name" value={f.auth_header_name || 'Authorization'} onChange={(e) => setForm({ ...form, auth_header_name: e.target.value })} />
                            <TextField size="small" fullWidth label="Auth Header Prefix" value={f.auth_header_prefix || ''} onChange={(e) => setForm({ ...form, auth_header_prefix: e.target.value || null })} />
                            <TextField size="small" fullWidth label="Auth Token" type="password" value={f.auth_token || ''} onChange={(e) => setForm({ ...form, auth_token: e.target.value || null })} helperText="Leave empty to keep current token" />
                        </Stack>
                    ) : (
                        <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Webhook URL</Typography>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{buyer.webhook_url}</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Dispatch Mode</Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                        {buyer.auto_send && <Chip label="auto" size="small" color="primary" variant="outlined" />}
                                        {buyer.manual_send && <Chip label="manual" size="small" variant="outlined" />}
                                        {buyer.worker_send && <Chip label="worker" size="small" variant="outlined" />}
                                        {!buyer.auto_send && !buyer.manual_send && !buyer.worker_send && <Chip label="none" size="small" variant="outlined" color="default" />}
                                    </Box>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Payload Format</Typography>
                                    <Typography variant="body2">{buyer.payload_format}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Send Interval</Typography>
                                    <Typography variant="body2">{buyer.min_minutes_between_sends}–{buyer.max_minutes_between_sends} min</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Allow Resell</Typography>
                                    <Typography variant="body2">{buyer.allow_resell ? 'Yes' : 'No'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Requires Validation</Typography>
                                    <Typography variant="body2">{buyer.requires_validation ? 'Yes' : 'No'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">County Cooldown</Typography>
                                    <Typography variant="body2">{buyer.enforce_county_cooldown ? `${buyer.delay_same_county}h` : 'Off'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">State Cooldown</Typography>
                                    <Typography variant="body2">{buyer.enforce_state_cooldown ? `${buyer.delay_same_state}h` : 'Off'}</Typography>
                                </Box>
                            </Box>
                            {(buyer.states_on_hold || []).length > 0 && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">States on Hold</Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                        {buyer.states_on_hold.map(s => <Chip key={s} label={s} size="small" variant="outlined" />)}
                                    </Box>
                                </Box>
                            )}
                            <Box>
                                <Typography variant="caption" color="text.secondary">Auth</Typography>
                                <Typography variant="body2">{buyer.auth_header_name}{buyer.auth_header_prefix ? ` ${buyer.auth_header_prefix}` : ''} •••</Typography>
                            </Box>
                        </Stack>
                    )}
                </CardContent>
            </Card>

            {/* Status Card */}
            <Card variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600}>Status</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Total Sends</Typography>
                            <Typography variant="body1" fontWeight={600}>{buyer.total_sends}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Next Send</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                    {buyer.next_send_at
                                        ? new Date(buyer.next_send_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                                        : 'Not scheduled'}
                                </Typography>
                                <Button size="small" variant="text" sx={{ minWidth: 0, p: 0.5, fontSize: '0.7rem' }} onClick={() => {
                                    setSelectedDate(buyer.next_send_at ? dayjs(buyer.next_send_at) : dayjs());
                                    setDatePickerOpen(true);
                                }}>
                                    Edit
                                </Button>
                            </Box>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Last Send</Typography>
                            <Typography variant="body2">
                                {buyer.last_send_at
                                    ? new Date(buyer.last_send_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                                    : 'Never'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Created</Typography>
                            <Typography variant="body2">{new Date(buyer.created).toLocaleDateString()}</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Date Picker Dialog */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                    open={datePickerOpen}
                    onClose={() => setDatePickerOpen(false)}
                    label="Next Send Time"
                    value={selectedDate}
                    onChange={(v) => setSelectedDate(v)}
                    onAccept={handleSaveNextSend}
                    slotProps={{
                        textField: { sx: { display: 'none' } },
                        actionBar: { actions: ['cancel', 'accept'] }
                    }}
                />
            </LocalizationProvider>

            <Snackbar open={snack.open} autoHideDuration={6000} onClose={() => setSnack(p => ({ ...p, open: false }))}>
                <Alert onClose={() => setSnack(p => ({ ...p, open: false }))} severity={snack.severity} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AdminBuyerDetailsView;
