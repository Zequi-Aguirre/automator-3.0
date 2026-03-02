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
} from '@mui/material';
import { Edit, Delete, Refresh, ContentCopy, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import sourceService from '../../../services/source.service';
import { Source, SourceCreateDTO, SourceUpdateDTO, CreateSourceResponse, RefreshTokenResponse } from '../../../types/sourceTypes';
import CustomPagination from '../../Pagination';

const AdminSourcesSection = () => {
    const navigate = useNavigate();
    const [sources, setSources] = useState<Source[]>([]);
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [loading, setLoading] = useState(true);

    // Create/Edit dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<Source | null>(null);
    const [formData, setFormData] = useState<SourceCreateDTO | SourceUpdateDTO>({
        name: '',
        email: ''
    });

    // Token display dialog state
    const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
    const [displayToken, setDisplayToken] = useState('');
    const [tokenCopied, setTokenCopied] = useState(false);

    // Refresh token dialog state
    const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
    const [refreshingSource, setRefreshingSource] = useState<Source | null>(null);

    const [snack, setSnack] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const fetchSources = async () => {
        setLoading(true);
        try {
            const res = await sourceService.getAll({ page, limit });
            setSources(res.items);
            setCount(res.count);
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to fetch sources: ${errorMessage}`, severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSources();
    }, [page, limit]);

    const handleOpenDialog = (source?: Source) => {
        if (source) {
            setEditingSource(source);
            setFormData({
                name: source.name,
                email: source.email
            });
        } else {
            setEditingSource(null);
            setFormData({
                name: '',
                email: ''
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingSource(null);
    };

    const handleSave = async () => {
        try {
            if (editingSource) {
                await sourceService.update(editingSource.id, formData);
                setSnack({ open: true, message: "Source updated successfully", severity: "success" });
                handleCloseDialog();
                fetchSources();
            } else {
                const newSource = await sourceService.create(formData as SourceCreateDTO);
                setSnack({ open: true, message: "Source created successfully", severity: "success" });
                handleCloseDialog();
                fetchSources();

                // Show token dialog with the newly created token
                setDisplayToken(newSource.token);
                setTokenCopied(false);
                setTokenDialogOpen(true);
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({
                open: true,
                message: `Failed to ${editingSource ? 'update' : 'create'} source: ${errorMessage}`,
                severity: "error"
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this source?')) return;

        try {
            await sourceService.delete(id);
            setSnack({ open: true, message: "Source deleted successfully", severity: "success" });
            fetchSources();
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to delete source: ${errorMessage}`, severity: "error" });
        }
    };

    const handleOpenRefreshDialog = (source: Source) => {
        setRefreshingSource(source);
        setRefreshDialogOpen(true);
    };

    const handleCloseRefreshDialog = () => {
        setRefreshDialogOpen(false);
        setRefreshingSource(null);
    };

    const handleRefreshToken = async () => {
        if (!refreshingSource) return;

        try {
            const response = await sourceService.refreshToken(refreshingSource.id);
            setSnack({ open: true, message: "Token refreshed successfully", severity: "success" });
            handleCloseRefreshDialog();
            fetchSources();

            // Show token dialog with the new token
            setDisplayToken(response.token);
            setTokenCopied(false);
            setTokenDialogOpen(true);
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to refresh token: ${errorMessage}`, severity: "error" });
        }
    };

    const handleCopyToken = async () => {
        try {
            await navigator.clipboard.writeText(displayToken);
            setTokenCopied(true);
            setTimeout(() => setTokenCopied(false), 3000);
        } catch (error) {
            setSnack({ open: true, message: "Failed to copy token", severity: "error" });
        }
    };

    const handleCloseTokenDialog = () => {
        setTokenDialogOpen(false);
        setDisplayToken('');
        setTokenCopied(false);
    };

    const closeSnackbar = () => {
        setSnack(prev => ({ ...prev, open: false }));
    };

    return (
        <Container maxWidth={false} sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        Lead Sources
                    </Typography>

                    <Button variant="contained" onClick={() => handleOpenDialog()}>
                        Add Source
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
                                        <TableCell>Name</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Created</TableCell>
                                        <TableCell>Actions</TableCell>
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
                                            <TableCell>{source.name}</TableCell>
                                            <TableCell>{source.email}</TableCell>
                                            <TableCell>
                                                {new Date(source.created).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit'
                                                })}
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <IconButton size="small" onClick={() => handleOpenDialog(source)} title="Edit source">
                                                    <Edit />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => handleOpenRefreshDialog(source)} title="Refresh API token">
                                                    <Refresh />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => handleDelete(source.id)} title="Delete source">
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
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingSource ? 'Edit Source' : 'Create Source'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">
                        {editingSource ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Token Display Dialog (one-time display) */}
            <Dialog open={tokenDialogOpen} onClose={handleCloseTokenDialog} maxWidth="sm" fullWidth>
                <DialogTitle>API Token - Save This Now!</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Alert severity="warning">
                            This token will only be shown once. Copy it now and store it securely.
                            You will not be able to view it again.
                        </Alert>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                                value={displayToken}
                                fullWidth
                                InputProps={{
                                    readOnly: true,
                                    sx: { fontFamily: 'monospace' }
                                }}
                            />
                            <IconButton
                                onClick={handleCopyToken}
                                color={tokenCopied ? "success" : "default"}
                                title="Copy token"
                            >
                                {tokenCopied ? <CheckCircle /> : <ContentCopy />}
                            </IconButton>
                        </Box>
                        {tokenCopied && (
                            <Typography variant="body2" color="success.main">
                                Token copied to clipboard!
                            </Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseTokenDialog} variant="contained">
                        I've Saved the Token
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Refresh Token Confirmation Dialog */}
            <Dialog open={refreshDialogOpen} onClose={handleCloseRefreshDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Refresh API Token?</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Alert severity="error">
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                Warning: This action cannot be undone
                            </Typography>
                            <Typography variant="body2">
                                • The current token will be invalidated immediately<br />
                                • All API requests using the old token will fail<br />
                                • You must update any systems using this token
                            </Typography>
                        </Alert>
                        <Typography variant="body1">
                            Are you sure you want to refresh the API token for <strong>{refreshingSource?.name}</strong>?
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseRefreshDialog}>Cancel</Button>
                    <Button onClick={handleRefreshToken} variant="contained" color="error">
                        Refresh Token
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

export default AdminSourcesSection;
