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
import { Edit, Delete } from '@mui/icons-material';

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
        enforce_state_cooldown: false
    });

    const [snack, setSnack] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

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
                enforce_state_cooldown: buyer.enforce_state_cooldown ?? false
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
                enforce_state_cooldown: false
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
                        <TableContainer component={Paper}>
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
                                <TableBody>
                                    {buyers.map((buyer) => (
                                        <TableRow key={buyer.id}>
                                            <TableCell>{buyer.priority}</TableCell>
                                            <TableCell>{buyer.name}</TableCell>
                                            <TableCell>
                                                {buyer.webhook_url ? 'Valid' : 'Invalid'}
                                            </TableCell>
                                            <TableCell>{formatDispatchMode(buyer.dispatch_mode)}</TableCell>
                                            <TableCell>
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
                                            </TableCell>
                                            <TableCell>{buyer.total_sends}</TableCell>
                                            <TableCell>
                                                <IconButton size="small" onClick={() => handleOpenDialog(buyer)}>
                                                    <Edit />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => handleDelete(buyer.id)}>
                                                    <Delete />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
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

            <Snackbar open={snack.open} autoHideDuration={6000} onClose={closeSnackbar}>
                <Alert onClose={closeSnackbar} severity={snack.severity} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminBuyersSection;
