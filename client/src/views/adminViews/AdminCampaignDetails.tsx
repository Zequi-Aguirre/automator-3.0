import {useCallback, useEffect, useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    Container,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Divider,
    IconButton,
    Stack,
    TextField,
    Typography,
    Alert,
    Snackbar,
    Switch,
    FormControlLabel
} from '@mui/material';
import {ArrowBack, Edit, Save, Cancel} from '@mui/icons-material';
import {Campaign} from '../../types/campaignTypes.ts';

// Assuming you have a campaignService similar to the leadService
import campaignService from '../../services/campaign.service.tsx';

const AdminCampaignDetails = () => {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [editedCampaign, setEditedCampaign] = useState({
        name: '',
        external_id: '',
        is_active: false
    });
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const fetchCampaign = useCallback(async () => {
        try {
            if (!id) return;
            setLoading(true);
            const response = await campaignService.getById(id);
            setCampaign(response);
            setEditedCampaign({
                name: response.name ?? '',
                external_id: response.external_id ?? '',
                is_active: response.is_active
            });
        } catch (err) {
            setError('Failed to load campaign details');
            console.error('Error fetching campaign:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchCampaign();
    }, [fetchCampaign]);

    const handleEditClick = () => {
        setEditMode(true);
    };

    const showNotification = (message: string, severity: 'success' | 'error') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    const handleCancelEdit = () => {
        if (!campaign) return;
        setEditMode(false);
        setEditedCampaign({
            name: campaign.name ?? '',
            external_id: campaign.external_id ?? '',
            is_active: campaign.is_active
        });
    };

    const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target;
        setEditedCampaign(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, checked} = e.target;
        setEditedCampaign(prev => ({
            ...prev,
            [name]: checked
        }));
    };

    const handleSave = async () => {
        try {
            if (!id || !campaign) return;

            const updatedCampaign = {
                ...campaign,
                ...editedCampaign,
                modified: new Date().toISOString()
            };

            await campaignService.updateCampaign(id, updatedCampaign);
            setEditMode(false);
            await fetchCampaign();
            showNotification('Campaign updated successfully', 'success');
        } catch (err) {
            console.error('Error updating campaign:', err);
            showNotification('Failed to update campaign', 'error');
        }
    };

    if (loading) {
        return (
            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px'}}>
                <CircularProgress/>
            </Box>
        );
    }

    if (error ?? !campaign) {
        return (
            <Box sx={{p: 3}}>
                <Alert severity="error">{error ?? 'Campaign not found'}</Alert>
            </Box>
        );
    }

    return (
        <Container maxWidth="md">
            <Box sx={{py: 4}}>
                <Stack spacing={3}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <IconButton onClick={() => {
                            navigate('/a/campaigns')
                        }} size="large">
                            <ArrowBack/>
                        </IconButton>
                        <Typography variant="h4">Campaign Details</Typography>
                    </Stack>

                    <Card>
                        <CardHeader
                            title="Campaign Information"
                            action={
                                editMode
                                    ? (
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                startIcon={<Save/>}
                                                variant="contained"
                                                onClick={handleSave}
                                            >
                                                Save
                                            </Button>
                                            <Button
                                                startIcon={<Cancel/>}
                                                variant="outlined"
                                                onClick={handleCancelEdit}
                                            >
                                                Cancel
                                            </Button>
                                        </Stack>
                                    )
                                    : (
                                        <>
                                            <Button
                                                variant="contained"
                                                color="error"
                                                sx={{mr: 1}}
                                                onClick={() => {
                                                    setConfirmDialogOpen(true)
                                                }}
                                            >
                                                Trash
                                            </Button>
                                            <Button
                                                startIcon={<Edit/>}
                                                variant="contained"
                                                onClick={handleEditClick}
                                            >
                                                Edit
                                            </Button>
                                        </>
                                    )
                            }
                        />
                        <Divider/>
                        <CardContent>
                            <Stack spacing={3}>
                                <TextField
                                    fullWidth
                                    label="Campaign Name"
                                    name="name"
                                    value={editMode ? editedCampaign.name : (campaign.name ?? '')}
                                    onChange={handleTextInputChange}
                                    disabled={!editMode}
                                    required
                                />
                                <TextField
                                    fullWidth
                                    label="External ID"
                                    name="external_id"
                                    value={editMode ? editedCampaign.external_id : (campaign.external_id ?? '')}
                                    onChange={handleTextInputChange}
                                    disabled={!editMode}
                                    helperText="Optional external identifier for integration purposes"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={editMode ? editedCampaign.is_active : campaign.is_active}
                                            onChange={handleSwitchChange}
                                            name="is_active"
                                            disabled={!editMode}
                                        />
                                    }
                                    label="Active Campaign"
                                />
                                {!editMode && (
                                    <>
                                        <TextField
                                            fullWidth
                                            label="Created"
                                            value={new Date(campaign.created).toLocaleString()}
                                            disabled
                                        />
                                        <TextField
                                            fullWidth
                                            label="Last Modified"
                                            value={new Date(campaign.modified).toLocaleString()}
                                            disabled
                                        />
                                        {campaign.deleted && (
                                            <TextField
                                                fullWidth
                                                label="Deleted"
                                                value={new Date(campaign.deleted).toLocaleString()}
                                                disabled
                                            />
                                        )}
                                    </>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            </Box>

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmDialogOpen}
                onClose={() => {
                    setConfirmDialogOpen(false)
                }}
            >
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to move this campaign to trash? This action can be undone from the trash
                        section.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setConfirmDialogOpen(false)
                    }}>Cancel</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => {
                    setSnackbar(prev => ({...prev, open: false}))
                }}
                anchorOrigin={{vertical: 'top', horizontal: 'right'}}
            >
                <Alert
                    onClose={() => {
                        setSnackbar(prev => ({...prev, open: false}))
                    }}
                    severity={snackbar.severity}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminCampaignDetails;