import { useEffect, useState } from 'react';
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
    IconButton,
    Paper,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import leadManagerService from '../../../services/leadManager.service';
import { LeadManager, LeadManagerCreateDTO, LeadManagerUpdateDTO } from '../../../types/leadManagerTypes';

const AdminLeadManagersSection = () => {
    const navigate = useNavigate();
    const [managers, setManagers] = useState<LeadManager[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<LeadManager | null>(null);
    const [form, setForm] = useState<LeadManagerCreateDTO>({ name: '', email: '', phone: '', notes: '' });
    const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const fetchManagers = async () => {
        setLoading(true);
        try {
            const data = await leadManagerService.getAll({ page: 1, limit: 200 });
            setManagers(data.items);
        } catch {
            setSnack({ open: true, message: 'Failed to fetch managers', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchManagers(); }, []);

    const handleOpen = (manager?: LeadManager) => {
        if (manager) {
            setEditing(manager);
            setForm({ name: manager.name, email: manager.email || '', phone: manager.phone || '', notes: manager.notes || '' });
        } else {
            setEditing(null);
            setForm({ name: '', email: '', phone: '', notes: '' });
        }
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editing) {
                const dto: LeadManagerUpdateDTO = { ...form };
                await leadManagerService.update(editing.id, dto);
                setSnack({ open: true, message: 'Manager updated', severity: 'success' });
            } else {
                await leadManagerService.create(form);
                setSnack({ open: true, message: 'Manager created', severity: 'success' });
            }
            setDialogOpen(false);
            fetchManagers();
        } catch (error: any) {
            setSnack({ open: true, message: error.response?.data?.error || 'Failed to save', severity: 'error' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this manager?')) return;
        try {
            await leadManagerService.delete(id);
            setSnack({ open: true, message: 'Manager deleted', severity: 'success' });
            fetchManagers();
        } catch {
            setSnack({ open: true, message: 'Failed to delete manager', severity: 'error' });
        }
    };

    return (
        <Container maxWidth={false} sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Lead Managers</Typography>
                    <Button variant="contained" onClick={() => handleOpen()}>Add Manager</Button>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : (
                    <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                        <TableContainer component={Paper} sx={{ height: '100%' }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Phone</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {managers.map((m) => (
                                        <TableRow
                                            key={m.id}
                                            hover
                                            onClick={() => navigate(`/lead-managers/${m.id}`)}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <TableCell>{m.name}</TableCell>
                                            <TableCell>{m.email || '—'}</TableCell>
                                            <TableCell>{m.phone || '—'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={m.active ? 'Active' : 'Inactive'}
                                                    color={m.active ? 'success' : 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <IconButton size="small" onClick={() => handleOpen(m)} title="Edit">
                                                    <Edit />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => handleDelete(m.id)} title="Delete">
                                                    <Delete />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {managers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">No managers yet</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </Box>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editing ? 'Edit Manager' : 'Add Manager'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Email"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label="Phone"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label="Notes"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            multiline
                            rows={2}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">
                        {editing ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack(p => ({ ...p, open: false }))}>
                <Alert onClose={() => setSnack(p => ({ ...p, open: false }))} severity={snack.severity} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminLeadManagersSection;
