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
    Tooltip,
    Typography,
} from '@mui/material';
import { Add, ToggleOff, ToggleOn } from '@mui/icons-material';
import trashReasonService, { TrashReason } from '../../../services/trashReason.service';

interface Props {
    embedded?: boolean;
}

const AdminTrashReasonsSection = ({ embedded = false }: Props) => {
    const [reasons, setReasons] = useState<TrashReason[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await trashReasonService.getAll();
            setReasons(data);
        } catch {
            setSnack({ message: 'Failed to load reasons', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, []);

    const handleCreate = async () => {
        if (!newLabel.trim()) return;
        setSaving(true);
        try {
            const created = await trashReasonService.create(newLabel.trim());
            setReasons(prev => [...prev, created]);
            setDialogOpen(false);
            setNewLabel('');
            setSnack({ message: 'Reason created', severity: 'success' });
        } catch {
            setSnack({ message: 'Failed to create reason', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (reason: TrashReason) => {
        try {
            const updated = await trashReasonService.setActive(reason.id, !reason.active);
            setReasons(prev => prev.map(r => r.id === updated.id ? updated : r));
            setSnack({ message: `Reason ${updated.active ? 'activated' : 'deactivated'}`, severity: 'success' });
        } catch {
            setSnack({ message: 'Failed to update reason', severity: 'error' });
        }
    };

    const inner = (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                    <Typography variant="h6" fontWeight={600}>Trash Reasons</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Reasons available when trashing a lead.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => { setDialogOpen(true); }}
                    size="small"
                >
                    Add Reason
                </Button>
            </Stack>

            {loading && (
                <Box display="flex" justifyContent="center" py={6}>
                    <CircularProgress />
                </Box>
            )}
            {!loading && (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Label</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reasons.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        No reasons yet. Add one above.
                                    </TableCell>
                                </TableRow>
                            )}
                            {reasons.map(reason => (
                                <TableRow key={reason.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ opacity: reason.active ? 1 : 0.45 }}>
                                            {reason.label}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={reason.active ? 'Active' : 'Inactive'}
                                            size="small"
                                            color={reason.active ? 'success' : 'default'}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title={reason.active ? 'Deactivate' : 'Activate'}>
                                            <IconButton
                                                size="small"
                                                onClick={() => { void handleToggleActive(reason); }}
                                                color={reason.active ? 'error' : 'success'}
                                            >
                                                {reason.active ? <ToggleOn /> : <ToggleOff />}
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setNewLabel(''); }} maxWidth="xs" fullWidth>
                <DialogTitle>Add Trash Reason</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Label"
                        fullWidth
                        size="small"
                        value={newLabel}
                        onChange={(e) => { setNewLabel(e.target.value); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { void handleCreate(); } }}
                        autoFocus
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setDialogOpen(false); setNewLabel(''); }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => { void handleCreate(); }}
                        disabled={!newLabel.trim() || saving}
                    >
                        {saving ? 'Saving…' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={!!snack}
                autoHideDuration={3000}
                onClose={() => { setSnack(null); }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snack?.severity} onClose={() => { setSnack(null); }}>
                    {snack?.message}
                </Alert>
            </Snackbar>
        </Box>
    );

    return embedded ? inner : <Container maxWidth="md" sx={{ py: 3 }}>{inner}</Container>;
};

export default AdminTrashReasonsSection;
