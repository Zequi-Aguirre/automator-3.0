import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    IconButton,
    Snackbar,
    Alert,
    Stack,
    Typography,
} from '@mui/material';
import BuyerFormFields from '../../components/admin/adminBuyersSection/BuyerFormFields';
import { ArrowBack, Edit, Save, Cancel, Delete, PauseCircle, PlayCircle } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

import buyerService from '../../services/buyer.service';
import { Buyer, BuyerUpdateDTO } from '../../types/buyerTypes';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission } from '../../types/userTypes';

const AdminBuyerDetailsView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { can } = usePermissions();

    const [buyer, setBuyer] = useState<Buyer | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<BuyerUpdateDTO>({});
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
            send_lead_id: buyer.send_lead_id,
            send_private_note: buyer.send_private_note,
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

    const handleToggleHold = async () => {
        if (!id || !buyer) return;
        try {
            const updated = await buyerService.setOnHold(id, !buyer.on_hold);
            setBuyer(updated);
            setSnack({ open: true, message: updated.on_hold ? 'Buyer put on hold' : 'Buyer removed from hold', severity: 'success' });
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to update hold status: ${msg}`, severity: 'error' });
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
                {buyer.on_hold && <Chip label="On Hold" color="warning" size="small" />}
                {can(Permission.BUYERS_HOLD) && (
                    <Button
                        size="small"
                        variant="outlined"
                        color={buyer.on_hold ? 'success' : 'warning'}
                        startIcon={buyer.on_hold ? <PlayCircle /> : <PauseCircle />}
                        onClick={handleToggleHold}
                    >
                        {buyer.on_hold ? 'Resume' : 'Put on Hold'}
                    </Button>
                )}
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
                        <BuyerFormFields
                            key={`${id ?? ''}-edit`}
                            formData={form}
                            onChange={(data) => { setForm(data as BuyerUpdateDTO); }}
                            isEditing={true}
                            hasStoredToken={!!(buyer?.auth_token_encrypted)}
                        />
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
