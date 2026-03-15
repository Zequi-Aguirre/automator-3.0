import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    CircularProgress,
    Snackbar,
    Alert,
    Button,
    TextField,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Switch,
    Chip,
    Tooltip
} from '@mui/material';
import { Edit, Delete, DragIndicator, PauseCircle, PlayCircle } from '@mui/icons-material';
import { usePermissions } from '../../../hooks/usePermissions';
import { Permission } from '../../../types/userTypes';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

import buyerService from '../../../services/buyer.service';
import { Buyer, BuyerCreateDTO, BuyerUpdateDTO } from '../../../types/buyerTypes';
import CustomPagination from '../../Pagination';
import { US_STATES } from '../../../constants/usStates';

// Format dispatch mode as "auto / manual / worker" showing only enabled modes
const formatDispatchMode = (buyer: Buyer): string => {
    const parts: string[] = [];
    if (buyer.auto_send) parts.push('auto');
    if (buyer.manual_send) parts.push('manual');
    if (buyer.worker_send) parts.push('worker');
    return parts.length > 0 ? parts.join(' / ') : 'none';
};

const getRelativeTime = (date: string | null): string => {
    if (!date) return 'Not scheduled';
    const now = new Date();
    const target = new Date(date);
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) return 'Ready';
    const diffMins = Math.ceil(diffMs / 60000);
    if (diffMins < 1) return 'Less than 1 min';
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `in ${hours}h ${mins}m` : `in ${mins}m`;
};

interface SortableRowProps {
    buyer: Buyer;
    onEdit: (buyer: Buyer) => void;
    onDelete: (id: string) => void;
    onToggleHold: (buyer: Buyer) => void;
    onOpenDatePicker: (buyer: Buyer) => void;
    onNavigate: (id: string) => void;
    canHold: boolean;
}

const SortableRow = ({ buyer, onEdit, onDelete, onToggleHold, onOpenDatePicker, onNavigate, canHold }: SortableRowProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: buyer.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isDragging ? '#f5f5f5' : 'inherit',
    };

    return (
        <TableRow ref={setNodeRef} style={style}>
            <TableCell>
                <Box
                    {...attributes}
                    {...listeners}
                    sx={{ cursor: 'grab', display: 'flex', alignItems: 'center', '&:active': { cursor: 'grabbing' } }}
                >
                    <DragIndicator sx={{ color: 'text.secondary', mr: 1 }} />
                    {buyer.priority}
                </Box>
            </TableCell>
            <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                        variant="body2"
                        sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => onNavigate(buyer.id)}
                    >
                        {buyer.name}
                    </Typography>
                    {buyer.on_hold && <Chip label="on hold" size="small" color="warning" />}
                </Box>
            </TableCell>
            <TableCell>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                    {formatDispatchMode(buyer)}
                </Typography>
            </TableCell>
            <TableCell>
                <Box
                    onClick={() => onOpenDatePicker(buyer)}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover', borderRadius: 1 }, padding: 1, margin: -1 }}
                >
                    {buyer.next_send_at ? (
                        <Box>
                            <Typography variant="body2">
                                {new Date(buyer.next_send_at).toLocaleString('en-US', {
                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                                })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {getRelativeTime(buyer.next_send_at)}
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">Not scheduled</Typography>
                    )}
                </Box>
            </TableCell>
            <TableCell>{buyer.total_sends}</TableCell>
            <TableCell>
                <IconButton size="small" onClick={() => onEdit(buyer)}>
                    <Edit />
                </IconButton>
                {canHold && (
                    <Tooltip title={buyer.on_hold ? 'Resume' : 'Put on Hold'}>
                        <IconButton size="small" color={buyer.on_hold ? 'success' : 'warning'} onClick={() => onToggleHold(buyer)}>
                            {buyer.on_hold ? <PlayCircle /> : <PauseCircle />}
                        </IconButton>
                    </Tooltip>
                )}
                <IconButton size="small" onClick={() => onDelete(buyer.id)}>
                    <Delete />
                </IconButton>
            </TableCell>
        </TableRow>
    );
};

const defaultForm = (): BuyerCreateDTO => ({
    name: '',
    webhook_url: '',
    priority: 1,
    auto_send: false,
    manual_send: true,
    worker_send: true,
    allow_resell: true,
    requires_validation: false,
    min_minutes_between_sends: 4,
    max_minutes_between_sends: 11,
    auth_header_name: 'Authorization',
    auth_header_prefix: null,
    auth_token: null,
    states_on_hold: [],
    delay_same_county: 36,
    delay_same_state: 0,
    enforce_county_cooldown: true,
    enforce_state_cooldown: false,
    payload_format: 'default'
});

const AdminBuyersSection = () => {
    const navigate = useNavigate();
    const { can } = usePermissions();
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
    const [formData, setFormData] = useState<BuyerCreateDTO | BuyerUpdateDTO>(defaultForm());
    const [showStates, setShowStates] = useState(false);
    const [requiresAuth, setRequiresAuth] = useState(false);
    const [authPreset, setAuthPreset] = useState<'bearer' | 'apikey' | 'custom'>('bearer');

    const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [editingBuyerForDate, setEditingBuyerForDate] = useState<Buyer | null>(null);
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const fetchBuyers = async () => {
        setLoading(true);
        try {
            const res = await buyerService.getAll({ page, limit });
            setBuyers(res.items);
            setCount(res.count);
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to fetch buyers: ${msg}`, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBuyers(); }, [page, limit]);

    const detectAuthPreset = (headerName: string, prefix: string | null): 'bearer' | 'apikey' | 'custom' => {
        if (headerName === 'Authorization' && prefix === 'Bearer') return 'bearer';
        if (!prefix) return 'apikey';
        return 'custom';
    };

    const handleOpenDialog = (buyer?: Buyer) => {
        if (buyer) {
            setEditingBuyer(buyer);
            setShowStates((buyer.states_on_hold || []).length > 0);
            const hasAuth = !!(buyer.auth_token_encrypted || buyer.auth_header_prefix || buyer.auth_header_name !== 'Authorization');
            setRequiresAuth(hasAuth);
            setAuthPreset(detectAuthPreset(buyer.auth_header_name, buyer.auth_header_prefix));
            setFormData({
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
                delay_same_county: buyer.delay_same_county || 36,
                delay_same_state: buyer.delay_same_state || 0,
                enforce_county_cooldown: buyer.enforce_county_cooldown ?? true,
                enforce_state_cooldown: buyer.enforce_state_cooldown ?? false,
                payload_format: buyer.payload_format ?? 'default'
            });
        } else {
            setEditingBuyer(null);
            setShowStates(false);
            setRequiresAuth(false);
            setAuthPreset('bearer');
            setFormData(defaultForm());
        }
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editingBuyer) {
                const updateData = { ...formData };
                if (!updateData.auth_token) delete updateData.auth_token;
                await buyerService.update(editingBuyer.id, updateData);
                setSnack({ open: true, message: 'Buyer updated successfully', severity: 'success' });
            } else {
                await buyerService.create(formData as BuyerCreateDTO);
                setSnack({ open: true, message: 'Buyer created successfully', severity: 'success' });
            }
            setDialogOpen(false);
            setEditingBuyer(null);
            fetchBuyers();
        } catch (error: any) {
            const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to ${editingBuyer ? 'update' : 'create'} buyer: ${msg}`, severity: 'error' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this buyer?')) return;
        try {
            await buyerService.delete(id);
            setSnack({ open: true, message: 'Buyer deleted successfully', severity: 'success' });
            fetchBuyers();
        } catch (error: any) {
            const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to delete buyer: ${msg}`, severity: 'error' });
        }
    };

    const handleToggleHold = async (buyer: Buyer) => {
        try {
            const updated = await buyerService.setOnHold(buyer.id, !buyer.on_hold);
            setBuyers(prev => prev.map(b => b.id === updated.id ? updated : b));
            setSnack({ open: true, message: updated.on_hold ? `${updated.name} put on hold` : `${updated.name} resumed`, severity: 'success' });
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to update hold status: ${msg}`, severity: 'error' });
        }
    };

    const handleOpenDatePicker = (buyer: Buyer) => {
        setEditingBuyerForDate(buyer);
        setSelectedDate(buyer.next_send_at ? dayjs(buyer.next_send_at) : dayjs());
        setDatePickerOpen(true);
    };

    const handleSaveNextSendTime = async () => {
        if (!editingBuyerForDate || !selectedDate) return;
        try {
            await buyerService.update(editingBuyerForDate.id, { next_send_at: selectedDate.toISOString() });
            setSnack({ open: true, message: 'Next send time updated', severity: 'success' });
            setDatePickerOpen(false);
            setEditingBuyerForDate(null);
            setSelectedDate(null);
            fetchBuyers();
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to update: ${msg}`, severity: 'error' });
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const movedBuyer = buyers.find(b => b.id === active.id);
        const targetBuyer = buyers.find(b => b.id === over.id);
        if (!movedBuyer || !targetBuyer) return;

        try {
            const oldIndex = buyers.findIndex(b => b.id === active.id);
            const newIndex = buyers.findIndex(b => b.id === over.id);
            const reordered = [...buyers];
            const [removed] = reordered.splice(oldIndex, 1);
            reordered.splice(newIndex, 0, removed);
            setBuyers(reordered);

            await buyerService.reorderPriority(movedBuyer.id, movedBuyer.priority, targetBuyer.priority);
            await fetchBuyers();
            setSnack({ open: true, message: 'Priority updated', severity: 'success' });
        } catch (error: any) {
            await fetchBuyers();
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to update priority: ${msg}`, severity: 'error' });
        }
    };

    const fd = formData as any;

    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Buyers</Typography>
                <Button variant="contained" onClick={() => handleOpenDialog()}>Add Buyer</Button>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <TableContainer component={Paper} sx={{ height: '100%' }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Priority</TableCell>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Dispatch</TableCell>
                                        <TableCell>Next Lead</TableCell>
                                        <TableCell>Sends</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <SortableContext items={buyers.map(b => b.id)} strategy={verticalListSortingStrategy}>
                                    <TableBody>
                                        {buyers.map((buyer) => (
                                            <SortableRow
                                                key={buyer.id}
                                                buyer={buyer}
                                                onEdit={handleOpenDialog}
                                                onDelete={handleDelete}
                                                onToggleHold={handleToggleHold}
                                                onOpenDatePicker={handleOpenDatePicker}
                                                onNavigate={(id) => navigate(`/buyers/${id}`)}
                                                canHold={can(Permission.BUYERS_HOLD)}
                                            />
                                        ))}
                                    </TableBody>
                                </SortableContext>
                            </Table>
                        </TableContainer>
                    </DndContext>
                </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CustomPagination page={page} setPage={setPage} rows={count} limit={limit} setLimit={setLimit} />
            </Box>

            {/* Create/Edit Dialog — compact */}
            <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingBuyer(null); }} maxWidth="sm" fullWidth>
                <DialogTitle>{editingBuyer ? 'Edit Buyer' : 'Add Buyer'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField size="small" label="Name" value={fd.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required fullWidth />
                        <TextField size="small" label="Webhook URL" value={fd.webhook_url || ''} onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })} required fullWidth />
                        <TextField size="small" label="Priority" type="number" value={fd.priority ?? 1} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })} required fullWidth />

                        {/* Dispatch Mode — 3 checkboxes */}
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Dispatch Mode</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <FormControlLabel
                                    control={<Checkbox size="small" checked={!!fd.auto_send} onChange={(e) => setFormData({ ...formData, auto_send: e.target.checked })} />}
                                    label={<Typography variant="body2">Auto Send</Typography>}
                                />
                                <FormControlLabel
                                    control={<Checkbox size="small" checked={fd.manual_send !== false} onChange={(e) => setFormData({ ...formData, manual_send: e.target.checked })} />}
                                    label={<Typography variant="body2">Manual</Typography>}
                                />
                                <FormControlLabel
                                    control={<Checkbox size="small" checked={fd.worker_send !== false} onChange={(e) => setFormData({ ...formData, worker_send: e.target.checked })} />}
                                    label={<Typography variant="body2">Worker</Typography>}
                                />
                            </Box>
                        </Box>

                        <FormControl size="small" fullWidth>
                            <InputLabel>Payload Format</InputLabel>
                            <Select
                                value={fd.payload_format ?? 'default'}
                                label="Payload Format"
                                onChange={(e) => setFormData({ ...formData, payload_format: e.target.value as 'default' | 'northstar' })}
                            >
                                <MenuItem value="default">Default</MenuItem>
                                <MenuItem value="northstar">Northstar (Compass / SellersDirect)</MenuItem>
                            </Select>
                        </FormControl>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField size="small" fullWidth label="Min Min Between Sends" type="number" value={fd.min_minutes_between_sends ?? 4} onChange={(e) => setFormData({ ...formData, min_minutes_between_sends: parseInt(e.target.value) })} />
                            <TextField size="small" fullWidth label="Max Min Between Sends" type="number" value={fd.max_minutes_between_sends ?? 11} onChange={(e) => setFormData({ ...formData, max_minutes_between_sends: parseInt(e.target.value) })} />
                        </Box>

                        <FormControlLabel
                            control={<Switch size="small" checked={!!fd.allow_resell} onChange={(e) => setFormData({ ...formData, allow_resell: e.target.checked })} />}
                            label={<Typography variant="body2">Allow Resell</Typography>}
                        />

                        {/* Requires Validation toggle */}
                        <FormControlLabel
                            control={<Switch size="small" checked={!!fd.requires_validation} onChange={(e) => setFormData({ ...formData, requires_validation: e.target.checked })} />}
                            label={<Typography variant="body2">Requires Validation</Typography>}
                        />

                        {/* States on Hold toggle + collapse */}
                        <FormControlLabel
                            control={<Switch size="small" checked={showStates} onChange={(e) => {
                                setShowStates(e.target.checked);
                                if (!e.target.checked) setFormData({ ...formData, states_on_hold: [] });
                            }} />}
                            label={<Typography variant="body2">
                                States on Hold {(fd.states_on_hold?.length ?? 0) > 0 && <Chip label={fd.states_on_hold.length} size="small" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }} />}
                            </Typography>}
                        />
                        {showStates && (
                            <TextField
                                select
                                size="small"
                                fullWidth
                                label="States on Hold"
                                SelectProps={{ multiple: true, value: fd.states_on_hold || [] }}
                                onChange={(e) => setFormData({ ...formData, states_on_hold: e.target.value as any })}
                            >
                                {US_STATES.map((state) => (
                                    <MenuItem key={state} value={state}>{state}</MenuItem>
                                ))}
                            </TextField>
                        )}

                        <FormControlLabel
                            control={<Switch size="small" checked={!!fd.enforce_county_cooldown} onChange={(e) => setFormData({ ...formData, enforce_county_cooldown: e.target.checked })} />}
                            label={<Typography variant="body2">Enforce County Cooldown</Typography>}
                        />
                        {fd.enforce_county_cooldown && (
                            <TextField size="small" fullWidth label="County Cooldown (hours)" type="number" value={fd.delay_same_county ?? 36} onChange={(e) => setFormData({ ...formData, delay_same_county: parseInt(e.target.value) })} />
                        )}

                        <FormControlLabel
                            control={<Switch size="small" checked={!!fd.enforce_state_cooldown} onChange={(e) => setFormData({ ...formData, enforce_state_cooldown: e.target.checked })} />}
                            label={<Typography variant="body2">Enforce State Cooldown</Typography>}
                        />
                        {fd.enforce_state_cooldown && (
                            <TextField size="small" fullWidth label="State Cooldown (hours)" type="number" value={fd.delay_same_state ?? 0} onChange={(e) => setFormData({ ...formData, delay_same_state: parseInt(e.target.value) })} />
                        )}

                        {/* Authentication — collapsed behind toggle */}
                        <FormControlLabel
                            control={<Switch size="small" checked={requiresAuth} onChange={(e) => {
                                setRequiresAuth(e.target.checked);
                                if (!e.target.checked) {
                                    setAuthPreset('bearer');
                                    setFormData({ ...formData, auth_header_name: 'Authorization', auth_header_prefix: null, auth_token: null });
                                } else {
                                    setAuthPreset('bearer');
                                    setFormData({ ...formData, auth_header_name: 'Authorization', auth_header_prefix: 'Bearer' });
                                }
                            }} />}
                            label={<Typography variant="body2">Requires Authentication</Typography>}
                        />
                        {requiresAuth && (
                            <>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Auth Preset</InputLabel>
                                    <Select
                                        value={authPreset}
                                        label="Auth Preset"
                                        onChange={(e) => {
                                            const preset = e.target.value as 'bearer' | 'apikey' | 'custom';
                                            setAuthPreset(preset);
                                            if (preset === 'bearer') {
                                                setFormData({ ...formData, auth_header_name: 'Authorization', auth_header_prefix: 'Bearer' });
                                            } else if (preset === 'apikey') {
                                                setFormData({ ...formData, auth_header_name: 'X-Api-Key', auth_header_prefix: null });
                                            }
                                        }}
                                    >
                                        <MenuItem value="bearer">Bearer Token</MenuItem>
                                        <MenuItem value="apikey">API Key</MenuItem>
                                        <MenuItem value="custom">Custom</MenuItem>
                                    </Select>
                                </FormControl>
                                <TextField
                                    size="small"
                                    fullWidth
                                    label="Header Name"
                                    value={fd.auth_header_name || ''}
                                    onChange={(e) => {
                                        setAuthPreset('custom');
                                        setFormData({ ...formData, auth_header_name: e.target.value });
                                    }}
                                />
                                {authPreset !== 'apikey' && (
                                    <TextField
                                        size="small"
                                        fullWidth
                                        label="Header Prefix"
                                        value={fd.auth_header_prefix || ''}
                                        onChange={(e) => {
                                            setAuthPreset('custom');
                                            setFormData({ ...formData, auth_header_prefix: e.target.value || null });
                                        }}
                                    />
                                )}
                                <TextField
                                    size="small"
                                    fullWidth
                                    label="Auth Token"
                                    type="password"
                                    value={fd.auth_token || ''}
                                    onChange={(e) => setFormData({ ...formData, auth_token: e.target.value || null })}
                                    helperText={editingBuyer ? 'Leave empty to keep current token' : ''}
                                />
                            </>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setDialogOpen(false); setEditingBuyer(null); }}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">{editingBuyer ? 'Update' : 'Create'}</Button>
                </DialogActions>
            </Dialog>

            {/* Date/Time Picker Dialog */}
            <Dialog open={datePickerOpen} onClose={() => { setDatePickerOpen(false); setEditingBuyerForDate(null); setSelectedDate(null); }}>
                <DialogTitle>Edit Next Send Time</DialogTitle>
                <DialogContent>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Box sx={{ mt: 2 }}>
                            <DateTimePicker
                                label="Next Send Time"
                                value={selectedDate}
                                onChange={(v) => setSelectedDate(v)}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        </Box>
                    </LocalizationProvider>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setDatePickerOpen(false); setEditingBuyerForDate(null); setSelectedDate(null); }}>Cancel</Button>
                    <Button onClick={handleSaveNextSendTime} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={6000} onClose={() => setSnack(p => ({ ...p, open: false }))}>
                <Alert onClose={() => setSnack(p => ({ ...p, open: false }))} severity={snack.severity} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AdminBuyersSection;
