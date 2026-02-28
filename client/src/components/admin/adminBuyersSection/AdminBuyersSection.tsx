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
    Checkbox
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';

import buyerService from '../../../services/buyer.service';
import { Buyer, BuyerCreateDTO, BuyerUpdateDTO } from '../../../types/buyerTypes';
import CustomPagination from '../../Pagination';

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
        auth_token: null
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
        } catch (error) {
            setSnack({ open: true, message: "Failed to fetch buyers", severity: "error" });
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
                auth_token: null // Don't show encrypted token
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
                auth_token: null
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
                await buyerService.update(editingBuyer.id, formData);
                setSnack({ open: true, message: "Buyer updated successfully", severity: "success" });
            } else {
                await buyerService.create(formData as BuyerCreateDTO);
                setSnack({ open: true, message: "Buyer created successfully", severity: "success" });
            }
            handleCloseDialog();
            fetchBuyers();
        } catch (error) {
            setSnack({
                open: true,
                message: `Failed to ${editingBuyer ? 'update' : 'create'} buyer: ${error}`,
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
        } catch (error) {
            setSnack({ open: true, message: `Failed to delete buyer: ${error}`, severity: "error" });
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
                                        <TableCell>Webhook URL</TableCell>
                                        <TableCell>Dispatch Mode</TableCell>
                                        <TableCell>Auto Send</TableCell>
                                        <TableCell>Total Sends</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {buyers.map((buyer) => (
                                        <TableRow key={buyer.id}>
                                            <TableCell>{buyer.priority}</TableCell>
                                            <TableCell>{buyer.name}</TableCell>
                                            <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {buyer.webhook_url}
                                            </TableCell>
                                            <TableCell>{buyer.dispatch_mode}</TableCell>
                                            <TableCell>{buyer.auto_send ? 'Yes' : 'No'}</TableCell>
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
