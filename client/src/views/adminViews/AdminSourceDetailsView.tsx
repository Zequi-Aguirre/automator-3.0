import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    CircularProgress,
    Container,
    Button,
    Paper,
    Stack,
    Chip,
    IconButton,
    Snackbar,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import { ArrowBack, Edit, Delete, Refresh, Add, ContentCopy, CheckCircle } from '@mui/icons-material';

import sourceService from '../../services/source.service';
import campaignService from '../../services/campaign.service';
import { Source } from '../../types/sourceTypes';
import { Campaign, CampaignCreateDTO, CampaignUpdateDTO } from '../../types/campaignTypes';

const AdminSourceDetailsView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [source, setSource] = useState<Source | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    // Campaign dialog state
    const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [campaignFormData, setCampaignFormData] = useState<CampaignCreateDTO | CampaignUpdateDTO>({
        source_id: id || '',
        name: '',
        blacklisted: false,
        rating: 3
    });

    // Refresh token dialog
    const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);

    // Token display dialog (after refresh)
    const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
    const [displayToken, setDisplayToken] = useState('');
    const [tokenCopied, setTokenCopied] = useState(false);

    // Edit source dialog
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({ name: '', email: '' });

    const [snack, setSnack] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    useEffect(() => {
        if (id) {
            fetchSourceDetails();
            fetchCampaigns();
        }
    }, [id]);

    const fetchSourceDetails = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await sourceService.getById(id);
            setSource(data);
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to fetch source: ${errorMessage}`, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchCampaigns = async () => {
        if (!id) return;
        try {
            const data = await campaignService.getBySource(id);
            setCampaigns(data.campaigns);
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to fetch campaigns: ${errorMessage}`, severity: 'error' });
        }
    };

    const handleDeleteSource = async () => {
        if (!id || !confirm('Are you sure you want to delete this source?')) return;

        try {
            await sourceService.delete(id);
            setSnack({ open: true, message: 'Source deleted successfully', severity: 'success' });
            setTimeout(() => navigate('/a/sources'), 1000);
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to delete source: ${errorMessage}`, severity: 'error' });
        }
    };

    const handleRefreshToken = async () => {
        if (!id) return;
        try {
            const response = await sourceService.refreshToken(id);
            setRefreshDialogOpen(false);

            // Show new token in one-time display dialog
            setDisplayToken(response.token);
            setTokenCopied(false);
            setTokenDialogOpen(true);

            setSnack({ open: true, message: 'Token refreshed successfully', severity: 'success' });
            fetchSourceDetails();
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to refresh token: ${errorMessage}`, severity: 'error' });
        }
    };

    const handleCopyToken = () => {
        navigator.clipboard.writeText(displayToken);
        setTokenCopied(true);
    };

    const handleCloseTokenDialog = () => {
        setTokenDialogOpen(false);
        setDisplayToken('');
        setTokenCopied(false);
    };

    const handleOpenEditDialog = () => {
        if (source) {
            setEditFormData({
                name: source.name,
                email: source.email
            });
            setEditDialogOpen(true);
        }
    };

    const handleSaveEdit = async () => {
        if (!id) return;
        try {
            await sourceService.update(id, editFormData);
            setSnack({ open: true, message: 'Source updated successfully', severity: 'success' });
            setEditDialogOpen(false);
            fetchSourceDetails();
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to update source: ${errorMessage}`, severity: 'error' });
        }
    };

    const handleOpenCampaignDialog = (campaign?: Campaign) => {
        if (campaign) {
            setEditingCampaign(campaign);
            setCampaignFormData({
                source_id: campaign.source_id,
                name: campaign.name,
                blacklisted: campaign.blacklisted,
                rating: campaign.rating
            });
        } else {
            setEditingCampaign(null);
            setCampaignFormData({
                source_id: id || '',
                name: '',
                blacklisted: false,
                rating: 3
            });
        }
        setCampaignDialogOpen(true);
    };

    const handleSaveCampaign = async () => {
        try {
            if (editingCampaign) {
                await campaignService.update(editingCampaign.id, campaignFormData);
                setSnack({ open: true, message: 'Campaign updated successfully', severity: 'success' });
            } else {
                await campaignService.create(campaignFormData as CampaignCreateDTO);
                setSnack({ open: true, message: 'Campaign created successfully', severity: 'success' });
            }
            setCampaignDialogOpen(false);
            fetchCampaigns();
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to ${editingCampaign ? 'update' : 'create'} campaign: ${errorMessage}`, severity: 'error' });
        }
    };

    const handleDeleteCampaign = async (campaignId: string) => {
        if (!confirm('Are you sure you want to delete this campaign?')) return;

        try {
            await campaignService.delete(campaignId);
            setSnack({ open: true, message: 'Campaign deleted successfully', severity: 'success' });
            fetchCampaigns();
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to delete campaign: ${errorMessage}`, severity: 'error' });
        }
    };

    if (loading) {
        return (
            <Container maxWidth={false}>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    if (!source) {
        return (
            <Container maxWidth={false}>
                <Box sx={{ p: 4 }}>
                    <Typography variant="h5">Source not found</Typography>
                    <Button onClick={() => navigate('/a/sources')} sx={{ mt: 2 }}>
                        Back to Sources
                    </Button>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                    <IconButton onClick={() => navigate('/a/sources')} title="Back to sources">
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                        {source.name}
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={handleOpenEditDialog}
                    >
                        Edit Source
                    </Button>
                    <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<Refresh />}
                        onClick={() => setRefreshDialogOpen(true)}
                    >
                        Refresh Token
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Delete />}
                        onClick={handleDeleteSource}
                    >
                        Delete Source
                    </Button>
                </Box>

                {/* Source Info */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                            <Typography variant="body1">{source.email}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                            <Typography variant="body1">
                                {new Date(source.created).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                })}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">Source ID</Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                {source.id}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>

                {/* Campaigns Section */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        Campaigns ({campaigns.length})
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleOpenCampaignDialog()}
                    >
                        Add Campaign
                    </Button>
                </Box>

                {/* Campaigns Table */}
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                    <TableContainer component={Paper}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Rating</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {campaigns.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                                                No campaigns yet. Click "Add Campaign" to create one.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    campaigns.map((campaign) => (
                                        <TableRow key={campaign.id}>
                                            <TableCell>{campaign.name}</TableCell>
                                            <TableCell>
                                                {campaign.blacklisted ? (
                                                    <Chip label="Blacklisted" color="error" size="small" />
                                                ) : (
                                                    <Chip label="Active" color="success" size="small" />
                                                )}
                                            </TableCell>
                                            <TableCell>{campaign.rating}</TableCell>
                                            <TableCell>
                                                {new Date(campaign.created).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                <IconButton size="small" onClick={() => handleOpenCampaignDialog(campaign)} title="Edit campaign">
                                                    <Edit />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => handleDeleteCampaign(campaign.id)} title="Delete campaign">
                                                    <Delete />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Box>

            {/* Campaign Create/Edit Dialog */}
            <Dialog open={campaignDialogOpen} onClose={() => setCampaignDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Campaign Name"
                            value={campaignFormData.name}
                            onChange={(e) => setCampaignFormData({ ...campaignFormData, name: e.target.value })}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Rating"
                            type="number"
                            value={campaignFormData.rating}
                            onChange={(e) => setCampaignFormData({ ...campaignFormData, rating: parseInt(e.target.value) || 0 })}
                            fullWidth
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={campaignFormData.blacklisted}
                                    onChange={(e) => setCampaignFormData({ ...campaignFormData, blacklisted: e.target.checked })}
                                />
                            }
                            label="Blacklisted"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCampaignDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveCampaign} variant="contained">
                        {editingCampaign ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Refresh Token Confirmation Dialog */}
            <Dialog open={refreshDialogOpen} onClose={() => setRefreshDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Refresh API Token?</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mt: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                            Warning: This action cannot be undone
                        </Typography>
                        <Typography variant="body2">
                            • The current token will be invalidated immediately<br />
                            • All API requests using the old token will fail<br />
                            • You must update any systems using this token
                        </Typography>
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRefreshDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleRefreshToken} variant="contained" color="warning">
                        Refresh Token
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Token Display Dialog (one-time display after refresh) */}
            <Dialog open={tokenDialogOpen} onClose={handleCloseTokenDialog} maxWidth="sm" fullWidth>
                <DialogTitle>New API Token - Save This Now!</DialogTitle>
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
                                    sx: { fontFamily: 'monospace', fontSize: '0.875rem' }
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
                                ✓ Token copied to clipboard!
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

            {/* Edit Source Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Source</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Name"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Email"
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                            required
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveEdit} variant="contained">
                        Update
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={6000} onClose={() => setSnack({ ...snack, open: false })}>
                <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminSourceDetailsView;
