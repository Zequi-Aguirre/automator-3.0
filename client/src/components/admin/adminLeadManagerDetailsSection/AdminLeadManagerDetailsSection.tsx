import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Paper,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import leadManagerService from '../../../services/leadManager.service';
import { LeadManager } from '../../../types/leadManagerTypes';
import { Source } from '../../../types/sourceTypes';

const AdminLeadManagerDetailsSection = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [manager, setManager] = useState<LeadManager | null>(null);
    const [sources, setSources] = useState<(Source & { campaign_count: number })[]>([]);
    const [loading, setLoading] = useState(true);
    const [snack, setSnack] = useState({ open: false, message: '', severity: 'error' as 'success' | 'error' });

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            setLoading(true);
            try {
                const [mgr, srcs] = await Promise.all([
                    leadManagerService.getById(id),
                    leadManagerService.getSourcesByManager(id),
                ]);
                setManager(mgr);
                setSources(srcs);
            } catch {
                setSnack({ open: true, message: 'Failed to load manager details', severity: 'error' });
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [id]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!manager) {
        return (
            <Container sx={{ p: 4 }}>
                <Alert severity="error">Manager not found.</Alert>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/lead-managers')} sx={{ mt: 2 }}>
                    Back to Lead Managers
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/lead-managers')} variant="outlined" size="small">
                    Lead Managers
                </Button>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {manager.name}
                </Typography>
                <Chip
                    label={manager.active ? 'Active' : 'Inactive'}
                    color={manager.active ? 'success' : 'default'}
                    size="small"
                />
            </Box>

            {/* Manager Info */}
            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Contact Info</Typography>
                <Stack direction="row" spacing={6}>
                    <Box>
                        <Typography variant="caption" color="text.secondary">Email</Typography>
                        <Typography variant="body1">{manager.email || '—'}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">Phone</Typography>
                        <Typography variant="body1">{manager.phone || '—'}</Typography>
                    </Box>
                    {manager.notes && (
                        <Box>
                            <Typography variant="caption" color="text.secondary">Notes</Typography>
                            <Typography variant="body1">{manager.notes}</Typography>
                        </Box>
                    )}
                </Stack>
            </Paper>

            {/* Assigned Sources */}
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Assigned Sources ({sources.length})
            </Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Source Name</TableCell>
                            <TableCell>Campaigns</TableCell>
                            <TableCell>Created</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sources.map((source) => (
                            <TableRow
                                key={source.id}
                                hover
                                onClick={() => navigate(`/a/sources/${source.id}`)}
                                sx={{ cursor: 'pointer' }}
                            >
                                <TableCell>
                                    <Typography variant="body2" color="primary">
                                        {source.name}
                                    </Typography>
                                </TableCell>
                                <TableCell>{source.campaign_count}</TableCell>
                                <TableCell>
                                    {new Date(source.created).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </TableCell>
                            </TableRow>
                        ))}
                        {sources.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} align="center">
                                    <Typography variant="body2" color="text.disabled">
                                        No sources assigned to this manager
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack(p => ({ ...p, open: false }))}>
                <Alert severity={snack.severity} onClose={() => setSnack(p => ({ ...p, open: false }))} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminLeadManagerDetailsSection;
