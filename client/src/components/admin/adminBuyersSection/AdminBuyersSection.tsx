import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    CircularProgress,
    Snackbar,
    Alert,
    Button,
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
    Chip,
    Tooltip
} from '@mui/material';
import BuyerFormFields from './BuyerFormFields';
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
    payload_format: 'default',
    send_lead_id: false,
    send_private_note: false,
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

    const handleOpenDialog = (buyer?: Buyer) => {
        if (buyer) {
            setEditingBuyer(buyer);
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
                payload_format: buyer.payload_format ?? 'default',
                send_lead_id: buyer.send_lead_id ?? false,
                send_private_note: buyer.send_private_note ?? false,
            });
        } else {
            setEditingBuyer(null);
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

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditingBuyer(null); }} maxWidth="sm" fullWidth>
                <DialogTitle>{editingBuyer ? 'Edit Buyer' : 'Add Buyer'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        <BuyerFormFields
                            key={editingBuyer?.id ?? 'new'}
                            formData={formData}
                            onChange={setFormData}
                            isEditing={!!editingBuyer}
                            hasStoredToken={!!(editingBuyer?.auth_token_encrypted)}
                        />
                    </Box>
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
