import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Container,
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
    Switch
} from '@mui/material';
import { Edit, Delete, DragIndicator } from '@mui/icons-material';
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

// Helper function to format dispatch mode
const formatDispatchMode = (mode: string): string => {
    if (mode === 'both') return 'Worker / Manual';
    return mode.charAt(0).toUpperCase() + mode.slice(1);
};

// Helper function to format relative time
const getRelativeTime = (date: string | null): string => {
    if (!date) return 'Not scheduled';

    const now = new Date();
    const target = new Date(date);
    const diffMs = target.getTime() - now.getTime();

    // Ready to send
    if (diffMs <= 0) return 'Ready';

    // Calculate minutes remaining (always round up)
    const diffMins = Math.ceil(diffMs / 60000);

    // Less than 1 minute
    if (diffMins < 1) return 'Less than 1 min';

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
        return `in ${hours}h ${mins}m`;
    } else {
        return `in ${mins}m`;
    }
};

// Sortable row component for drag-and-drop
interface SortableRowProps {
    buyer: Buyer;
    onEdit: (buyer: Buyer) => void;
    onDelete: (id: string) => void;
    onOpenDatePicker: (buyer: Buyer) => void;
}

const SortableRow = ({ buyer, onEdit, onDelete, onOpenDatePicker }: SortableRowProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: buyer.id });

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
                    sx={{
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        '&:active': { cursor: 'grabbing' }
                    }}
                >
                    <DragIndicator sx={{ color: 'text.secondary', mr: 1 }} />
                    {buyer.priority}
                </Box>
            </TableCell>
            <TableCell>{buyer.name}</TableCell>
            <TableCell>
                {buyer.webhook_url ? 'Valid' : 'Invalid'}
            </TableCell>
            <TableCell>{formatDispatchMode(buyer.dispatch_mode)}</TableCell>
            <TableCell>
                <Box
                    onClick={() => onOpenDatePicker(buyer)}
                    sx={{
                        cursor: 'pointer',
                        '&:hover': {
                            backgroundColor: 'action.hover',
                            borderRadius: 1
                        },
                        padding: 1,
                        margin: -1
                    }}
                >
                    {buyer.next_send_at ? (
                        <Box>
                            <Typography variant="body2">
                                {new Date(buyer.next_send_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {getRelativeTime(buyer.next_send_at)}
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Not scheduled
                        </Typography>
                    )}
                </Box>
            </TableCell>
            <TableCell>{buyer.total_sends}</TableCell>
            <TableCell>
                <IconButton size="small" onClick={() => onEdit(buyer)}>
                    <Edit />
                </IconButton>
                <IconButton size="small" onClick={() => onDelete(buyer.id)}>
                    <Delete />
                </IconButton>
            </TableCell>
        </TableRow>
    );
};

const AdminBuyersSection = () => {
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
    const [formData, setFormData] = useState<BuyerCreateDTO | BuyerUpdateDTO>({
        name: '',
        webhook_url: '',
        priority: 1,
        dispatch_mode: 'manual',
        auto_send: false,
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

    const [snack, setSnack] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    // Date picker state
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [editingBuyerForDate, setEditingBuyerForDate] = useState<Buyer | null>(null);
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

    // Drag-and-drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before drag starts
            },
        })
    );

    const fetchBuyers = async () => {
        setLoading(true);
        try {
            const res = await buyerService.getAll({ page, limit });
            setBuyers(res.items);
            setCount(res.count);
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to fetch buyers: ${errorMessage}`, severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBuyers();
    }, [page, limit]);

    const handleOpenDialog = (buyer?: Buyer) => {
        if (buyer) {
            setEditingBuyer(buyer);
            setFormData({
                name: buyer.name,
                webhook_url: buyer.webhook_url,
                priority: buyer.priority,
                dispatch_mode: buyer.dispatch_mode,
                auto_send: buyer.auto_send,
                allow_resell: buyer.allow_resell,
                requires_validation: buyer.requires_validation,
                min_minutes_between_sends: buyer.min_minutes_between_sends,
                max_minutes_between_sends: buyer.max_minutes_between_sends,
                auth_header_name: buyer.auth_header_name,
                auth_header_prefix: buyer.auth_header_prefix,
                auth_token: null, // Don't show encrypted token
                states_on_hold: buyer.states_on_hold || [],
                delay_same_county: buyer.delay_same_county || 36,
                delay_same_state: buyer.delay_same_state || 0,
                enforce_county_cooldown: buyer.enforce_county_cooldown ?? true,
                enforce_state_cooldown: buyer.enforce_state_cooldown ?? false,
                payload_format: buyer.payload_format ?? 'default'
            });
        } else {
            setEditingBuyer(null);
            setFormData({
                name: '',
                webhook_url: '',
                priority: 1,
                dispatch_mode: 'manual',
                auto_send: false,
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
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingBuyer(null);
    };

    const handleSave = async () => {
        try {
            if (editingBuyer) {
                // Don't send auth_token if it's empty (preserve existing token)
                const updateData = { ...formData };
                if (!updateData.auth_token) {
                    delete updateData.auth_token;
                }
                await buyerService.update(editingBuyer.id, updateData);
                setSnack({ open: true, message: "Buyer updated successfully", severity: "success" });
            } else {
                await buyerService.create(formData as BuyerCreateDTO);
                setSnack({ open: true, message: "Buyer created successfully", severity: "success" });
            }
            handleCloseDialog();
            fetchBuyers();
        } catch (error: any) {
            // Extract actual error message from backend response
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({
                open: true,
                message: `Failed to ${editingBuyer ? 'update' : 'create'} buyer: ${errorMessage}`,
                severity: "error"
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this buyer?')) return;

        try {
            await buyerService.delete(id);
            setSnack({ open: true, message: "Buyer deleted successfully", severity: "success" });
            fetchBuyers();
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to delete buyer: ${errorMessage}`, severity: "error" });
        }
    };

    const closeSnackbar = () => {
        setSnack(prev => ({ ...prev, open: false }));
    };

    const handleOpenDatePicker = (buyer: Buyer) => {
        setEditingBuyerForDate(buyer);
        setSelectedDate(buyer.next_send_at ? dayjs(buyer.next_send_at) : dayjs());
        setDatePickerOpen(true);
    };

    const handleCloseDatePicker = () => {
        setDatePickerOpen(false);
        setEditingBuyerForDate(null);
        setSelectedDate(null);
    };

    const handleSaveNextSendTime = async () => {
        if (!editingBuyerForDate || !selectedDate) return;

        try {
            await buyerService.update(editingBuyerForDate.id, {
                next_send_at: selectedDate.toISOString()
            });
            setSnack({ open: true, message: "Next send time updated successfully", severity: "success" });
            handleCloseDatePicker();
            fetchBuyers();
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to update next send time: ${errorMessage}`, severity: "error" });
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return; // No reorder needed
        }

        const movedBuyer = buyers.find(b => b.id === active.id);
        const targetBuyer = buyers.find(b => b.id === over.id);

        if (!movedBuyer || !targetBuyer) {
            return;
        }

        try {
            // Optimistically update UI
            const oldIndex = buyers.findIndex(b => b.id === active.id);
            const newIndex = buyers.findIndex(b => b.id === over.id);

            // Reorder the array temporarily for immediate feedback
            const reordered = [...buyers];
            const [removed] = reordered.splice(oldIndex, 1);
            reordered.splice(newIndex, 0, removed);
            setBuyers(reordered);

            // Call backend to persist the change
            await buyerService.reorderPriority(
                movedBuyer.id,
                movedBuyer.priority,
                targetBuyer.priority
            );

            // Refresh to get updated priorities from backend
            await fetchBuyers();
            setSnack({ open: true, message: "Priority updated successfully", severity: "success" });
        } catch (error: any) {
            // Revert on error
            await fetchBuyers();
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to update priority: ${errorMessage}`, severity: "error" });
        }
    };

    return (
        <Container maxWidth={false} sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        Buyers
                    </Typography>

                    <Button variant="contained" onClick={() => handleOpenDialog()}>
                        Add Buyer
                    </Button>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <TableContainer component={Paper} sx={{ height: '100%' }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Priority</TableCell>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Webhook</TableCell>
                                            <TableCell>Dispatch Mode</TableCell>
                                            <TableCell>Next Lead</TableCell>
                                            <TableCell>Total Sends</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <SortableContext
                                        items={buyers.map(b => b.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <TableBody>
                                            {buyers.map((buyer) => (
                                                <SortableRow
                                                    key={buyer.id}
                                                    buyer={buyer}
                                                    onEdit={handleOpenDialog}
                                                    onDelete={handleDelete}
                                                    onOpenDatePicker={handleOpenDatePicker}
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
                    <CustomPagination
                        page={page}
                        setPage={setPage}
                        rows={count}
                        limit={limit}
                        setLimit={setLimit}
                    />
                </Box>
            </Box>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>{editingBuyer ? 'Edit Buyer' : 'Create Buyer'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <TextField
                            label="Webhook URL"
                            value={formData.webhook_url}
                            onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                            required
                        />
                        <TextField
                            label="Priority"
                            type="number"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                            required
                        />
                        <FormControl>
                            <InputLabel>Dispatch Mode</InputLabel>
                            <Select
                                value={formData.dispatch_mode}
                                label="Dispatch Mode"
                                onChange={(e) => setFormData({ ...formData, dispatch_mode: e.target.value as any })}
                            >
                                <MenuItem value="manual">Manual</MenuItem>
                                <MenuItem value="worker">Worker</MenuItem>
                                <MenuItem value="both">Both</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl>
                            <InputLabel>Payload Format</InputLabel>
                            <Select
                                value={formData.payload_format ?? 'default'}
                                label="Payload Format"
                                onChange={(e) => setFormData({ ...formData, payload_format: e.target.value as 'default' | 'northstar' })}
                            >
                                <MenuItem value="default">Default</MenuItem>
                                <MenuItem value="northstar">Northstar (Compass / SellersDirect)</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Min Minutes Between Sends"
                            type="number"
                            value={formData.min_minutes_between_sends}
                            onChange={(e) => setFormData({ ...formData, min_minutes_between_sends: parseInt(e.target.value) })}
                        />
                        <TextField
                            label="Max Minutes Between Sends"
                            type="number"
                            value={formData.max_minutes_between_sends}
                            onChange={(e) => setFormData({ ...formData, max_minutes_between_sends: parseInt(e.target.value) })}
                        />
                        <FormControlLabel
                            control={<Checkbox checked={formData.auto_send} onChange={(e) => setFormData({ ...formData, auto_send: e.target.checked })} />}
                            label="Auto Send"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={formData.allow_resell} onChange={(e) => setFormData({ ...formData, allow_resell: e.target.checked })} />}
                            label="Allow Resell"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={formData.requires_validation} onChange={(e) => setFormData({ ...formData, requires_validation: e.target.checked })} />}
                            label="Requires Validation"
                        />
                        <TextField
                            label="Auth Header Name"
                            value={formData.auth_header_name}
                            onChange={(e) => setFormData({ ...formData, auth_header_name: e.target.value })}
                        />
                        <TextField
                            label="Auth Header Prefix"
                            value={formData.auth_header_prefix || ''}
                            onChange={(e) => setFormData({ ...formData, auth_header_prefix: e.target.value || null })}
                        />
                        <TextField
                            label="Auth Token (leave empty to keep current)"
                            type="password"
                            value={formData.auth_token || ''}
                            onChange={(e) => setFormData({ ...formData, auth_token: e.target.value || null })}
                            helperText={editingBuyer ? "Leave empty to keep current token" : ""}
                        />

                        <Typography variant="h6" sx={{ mt: 2 }}>Cooldown & Filtering</Typography>

                        <TextField
                            select
                            fullWidth
                            label="States on Hold"
                            SelectProps={{
                                multiple: true,
                                value: formData.states_on_hold || []
                            }}
                            onChange={(e) => setFormData({ ...formData, states_on_hold: e.target.value as any })}
                            helperText="States this buyer won't accept leads from"
                        >
                            {US_STATES.map((state) => (
                                <MenuItem key={state} value={state}>
                                    {state}
                                </MenuItem>
                            ))}
                        </TextField>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.enforce_county_cooldown}
                                    onChange={(e) => setFormData({ ...formData, enforce_county_cooldown: e.target.checked })}
                                />
                            }
                            label="Enforce County Cooldown"
                        />

                        {formData.enforce_county_cooldown && (
                            <TextField
                                label="Delay Same County (hours)"
                                type="number"
                                value={formData.delay_same_county}
                                onChange={(e) => setFormData({ ...formData, delay_same_county: parseInt(e.target.value) })}
                                helperText="Hours to wait before sending another lead from same county to this buyer"
                            />
                        )}

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.enforce_state_cooldown}
                                    onChange={(e) => setFormData({ ...formData, enforce_state_cooldown: e.target.checked })}
                                />
                            }
                            label="Enforce State Cooldown"
                        />

                        {formData.enforce_state_cooldown && (
                            <TextField
                                label="Delay Same State (hours)"
                                type="number"
                                value={formData.delay_same_state}
                                onChange={(e) => setFormData({ ...formData, delay_same_state: parseInt(e.target.value) })}
                                helperText="Hours to wait before sending another lead from same state to this buyer"
                            />
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">
                        {editingBuyer ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Date/Time Picker Dialog */}
            <Dialog open={datePickerOpen} onClose={handleCloseDatePicker}>
                <DialogTitle>Edit Next Send Time</DialogTitle>
                <DialogContent>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Box sx={{ mt: 2 }}>
                            <DateTimePicker
                                label="Next Send Time"
                                value={selectedDate}
                                onChange={(newValue) => setSelectedDate(newValue)}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        helperText: 'Set when this buyer should receive the next lead'
                                    }
                                }}
                            />
                        </Box>
                    </LocalizationProvider>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDatePicker}>Cancel</Button>
                    <Button onClick={handleSaveNextSendTime} variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={6000} onClose={closeSnackbar}>
                <Alert onClose={closeSnackbar} severity={snack.severity} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminBuyersSection;
