import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    Paper,
    Snackbar,
    Alert,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { ArrowBack, Edit, Delete, Refresh, Add, ContentCopy, CheckCircle } from '@mui/icons-material';

import sourceService from '../../services/source.service';
import campaignService from '../../services/campaign.service';
import buyerService from '../../services/buyer.service';
import { Source, SourceBuyerFilterMode } from '../../types/sourceTypes';
import { Campaign, CampaignCreateDTO, CampaignUpdateDTO } from '../../types/campaignTypes';
import { Buyer } from '../../types/buyerTypes';

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
    const [editFormData, setEditFormData] = useState({ name: '' });

    // Buyer filter state
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [filterMode, setFilterMode] = useState<SourceBuyerFilterMode | null>(null);
    const [filterBuyerIds, setFilterBuyerIds] = useState<string[]>([]);
    const [filterSaving, setFilterSaving] = useState(false);

    const [activeTab, setActiveTab] = useState(0);

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
        buyerService.getAll({ page: 1, limit: 200 }).then(res => setBuyers(res.items)).catch(() => {});
    }, [id]);

    const fetchSourceDetails = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await sourceService.getById(id);
            setSource(data);
            setFilterMode(data.buyer_filter_mode);
            setFilterBuyerIds(data.buyer_filter_buyer_ids ?? []);
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
            setTimeout(() => navigate('/sources'), 1000);
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

    const handleSaveBuyerFilter = async () => {
        if (!id) return;
        setFilterSaving(true);
        try {
            const updated = await sourceService.updateBuyerFilter(id, {
                mode: filterMode,
                buyer_ids: filterMode ? filterBuyerIds : [],
            });
            setSource(updated);
            setFilterMode(updated.buyer_filter_mode);
            setFilterBuyerIds(updated.buyer_filter_buyer_ids ?? []);
            setSnack({ open: true, message: 'Buyer filter saved', severity: 'success' });
        } catch {
            setSnack({ open: true, message: 'Failed to save buyer filter', severity: 'error' });
        } finally {
            setFilterSaving(false);
        }
    };

    const handleOpenEditDialog = () => {
        if (source) {
            setEditFormData({ name: source.name });
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
                    <Button onClick={() => navigate('/sources')} sx={{ mt: 2 }}>
                        Back to Sources
                    </Button>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

                {/* Header — always visible */}
                <Box sx={{ flexShrink: 0, px: 4, pt: 4, pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                        <IconButton onClick={() => navigate('/sources')} title="Back to sources">
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

                    <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tab label="Overview" />
                        <Tab label={`Campaigns (${campaigns.length})`} />
                    </Tabs>
                </Box>

                {/* Tab content — grows to fill remaining height */}
                <Box sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>

                    {/* Overview tab */}
                    {activeTab === 0 && (
                        <Box sx={{ px: 4, py: 3 }}>
                            {/* Source Info */}
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Stack spacing={2}>
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

                            {/* Buyer Filter Section */}
                            <Card variant="outlined">
                                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Typography variant="subtitle1" fontWeight={600}>Buyer Routing Filter</Typography>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            onClick={handleSaveBuyerFilter}
                                            disabled={filterSaving}
                                        >
                                            {filterSaving ? 'Saving…' : 'Save'}
                                        </Button>
                                    </Box>
                                    <Divider sx={{ mb: 2 }} />
                                    <Stack spacing={2}>
                                        <ToggleButtonGroup
                                            value={filterMode ?? 'none'}
                                            exclusive
                                            size="small"
                                            onChange={(_, val) => {
                                                const next = val === 'none' ? null : val as SourceBuyerFilterMode;
                                                setFilterMode(next);
                                                if (!next) setFilterBuyerIds([]);
                                            }}
                                        >
                                            <ToggleButton value="none">No Filter</ToggleButton>
                                            <ToggleButton value="include">Only send to selected</ToggleButton>
                                            <ToggleButton value="exclude">Block selected</ToggleButton>
                                        </ToggleButtonGroup>

                                        {filterMode && (
                                            <Autocomplete
                                                multiple
                                                options={buyers}
                                                getOptionLabel={(b) => b.name}
                                                value={buyers.filter(b => filterBuyerIds.includes(b.id))}
                                                onChange={(_, selected) => setFilterBuyerIds(selected.map(b => b.id))}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        size="small"
                                                        label={filterMode === 'include' ? 'Buyers to allow' : 'Buyers to block'}
                                                        placeholder="Select buyers…"
                                                    />
                                                )}
                                                renderTags={(value, getTagProps) =>
                                                    value.map((option, index) => (
                                                        <Chip
                                                            {...getTagProps({ index })}
                                                            key={option.id}
                                                            label={option.name}
                                                            size="small"
                                                            color={filterMode === 'include' ? 'success' : 'error'}
                                                            variant="outlined"
                                                        />
                                                    ))
                                                }
                                            />
                                        )}

                                        {!filterMode && (
                                            <Typography variant="body2" color="text.secondary">
                                                Leads from this source will be sent to all eligible buyers.
                                            </Typography>
                                        )}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Box>
                    )}

                    {/* Campaigns tab — full height table */}
                    {activeTab === 1 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', px: 4, pt: 3, pb: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<Add />}
                                    onClick={() => handleOpenCampaignDialog()}
                                >
                                    Add Campaign
                                </Button>
                            </Box>
                            <TableContainer component={Paper} sx={{ flexGrow: 1, overflow: 'auto' }}>
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
                    )}

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
