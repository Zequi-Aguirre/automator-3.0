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
import { Add, DeleteOutline, ToggleOff, ToggleOn } from '@mui/icons-material';
import Checkbox from '@mui/material/Checkbox';
import callOutcomeService, { CallOutcome } from '../../../services/callOutcome.service';

interface Props {
    embedded?: boolean;
    onCountChange?: (count: number) => void;
}

const AdminCallOutcomesSection = ({ embedded = false, onCountChange }: Props) => {
    const [outcomes, setOutcomes] = useState<CallOutcome[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<CallOutcome | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await callOutcomeService.getAll();
            setOutcomes(data);
        } catch {
            setSnack({ message: 'Failed to load outcomes', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, []);
    useEffect(() => { onCountChange?.(outcomes.length); }, [outcomes.length]);

    const handleCreate = async () => {
        if (!newLabel.trim()) return;
        setSaving(true);
        try {
            const created = await callOutcomeService.create(newLabel.trim());
            setOutcomes(prev => [...prev, created]);
            setDialogOpen(false);
            setNewLabel('');
            setSnack({ message: 'Outcome created', severity: 'success' });
        } catch {
            setSnack({ message: 'Failed to create outcome', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (outcome: CallOutcome) => {
        try {
            const updated = await callOutcomeService.setActive(outcome.id, !outcome.active);
            setOutcomes(prev => prev.map(o => o.id === updated.id ? updated : o));
            setSnack({ message: `Outcome ${updated.active ? 'activated' : 'deactivated'}`, severity: 'success' });
        } catch {
            setSnack({ message: 'Failed to update outcome', severity: 'error' });
        }
    };

    const handleToggleCommentRequired = async (outcome: CallOutcome) => {
        try {
            const updated = await callOutcomeService.setCommentRequired(outcome.id, !outcome.comment_required);
            setOutcomes(prev => prev.map(o => o.id === updated.id ? updated : o));
        } catch {
            setSnack({ message: 'Failed to update comment setting', severity: 'error' });
        }
    };

    const handleToggleResolvesCall = async (outcome: CallOutcome) => {
        try {
            const updated = await callOutcomeService.setResolvesCall(outcome.id, !outcome.resolves_call);
            setOutcomes(prev => prev.map(o => o.id === updated.id ? updated : o));
        } catch {
            setSnack({ message: 'Failed to update resolves call setting', severity: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await callOutcomeService.delete(deleteTarget.id);
            setOutcomes(prev => prev.filter(o => o.id !== deleteTarget.id));
            setSnack({ message: 'Outcome deleted', severity: 'success' });
        } catch {
            setSnack({ message: 'Failed to delete outcome', severity: 'error' });
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    const inner = (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                {!embedded && (
                    <Box>
                        <Typography variant="h6" fontWeight={600}>Call Outcomes</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Outcomes available when logging a call result.
                        </Typography>
                    </Box>
                )}
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => { setDialogOpen(true); }}
                    size="small"
                >
                    Add Outcome
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
                                <TableCell>
                                    <Tooltip title="When checked, agents must enter a comment when selecting this outcome">
                                        <span>Comment Required</span>
                                    </Tooltip>
                                </TableCell>
                                <TableCell>
                                    <Tooltip title="When checked, selecting this outcome closes the Needs Call ticket">
                                        <span>Resolves Call</span>
                                    </Tooltip>
                                </TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {outcomes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        No outcomes yet. Add one above.
                                    </TableCell>
                                </TableRow>
                            )}
                            {outcomes.map(outcome => (
                                <TableRow key={outcome.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ opacity: outcome.active ? 1 : 0.45 }}>
                                            {outcome.label}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={outcome.active ? 'Active' : 'Inactive'}
                                            size="small"
                                            color={outcome.active ? 'success' : 'default'}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title={outcome.comment_required ? 'Comment mandatory — click to make optional' : 'Comment optional — click to make mandatory'}>
                                            <Checkbox
                                                size="small"
                                                checked={outcome.comment_required}
                                                onChange={() => { void handleToggleCommentRequired(outcome); }}
                                                sx={{ p: 0.5 }}
                                            />
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title={outcome.resolves_call ? 'Closes ticket — click to disable' : 'Does not close ticket — click to enable'}>
                                            <Checkbox
                                                size="small"
                                                checked={outcome.resolves_call}
                                                onChange={() => { void handleToggleResolvesCall(outcome); }}
                                                sx={{ p: 0.5 }}
                                            />
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" justifyContent="flex-end">
                                            <Tooltip title={outcome.active ? 'Deactivate' : 'Activate'}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => { void handleToggleActive(outcome); }}
                                                    color={outcome.active ? 'success' : 'default'}
                                                >
                                                    {outcome.active ? <ToggleOn /> : <ToggleOff />}
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete permanently">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => { setDeleteTarget(outcome); }}
                                                    color="error"
                                                >
                                                    <DeleteOutline />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteTarget} onClose={() => { setDeleteTarget(null); }} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Outcome</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to permanently delete <strong>"{deleteTarget?.label}"</strong>? This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setDeleteTarget(null); }}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => { void handleDelete(); }}
                        disabled={deleting}
                    >
                        {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create dialog */}
            <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setNewLabel(''); }} maxWidth="xs" fullWidth>
                <DialogTitle>Add Call Outcome</DialogTitle>
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

export default AdminCallOutcomesSection;
