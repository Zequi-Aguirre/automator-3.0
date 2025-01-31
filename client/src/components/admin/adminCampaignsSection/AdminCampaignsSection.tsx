import {useCallback, useEffect, useState} from 'react';
import campaignService from "../../../services/campaign.service";
import AdminCampaignsTable from "./adminCampaignsTable/AdminCampaignsTable";
import CustomPagination from "../../Pagination";
import {
    Box,
    Typography,
    CircularProgress,
    Container,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Switch,
    Alert,
    Snackbar
} from "@mui/material";
import {Add as AddIcon} from '@mui/icons-material';
import {Campaign} from "../../../types/campaignTypes";

const INITIAL_CAMPAIGN_STATE = {
    name: '',
    external_id: '',
    is_active: true
};

const AdminCampaignsSection = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [page, setPage] = useState(1);
    const [campaignCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState(50);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newCampaign, setNewCampaign] = useState(INITIAL_CAMPAIGN_STATE);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const showNotification = useCallback((message: string, severity: 'success' | 'error') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    }, []);

    const fetchCampaigns = useCallback(async () => {
        try {
            const response = await campaignService.getAll();
            setCampaigns(response);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            showNotification('Failed to fetch campaigns', 'error');
        }
    }, [showNotification]);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    const handleCreateModalClose = useCallback(() => {
        setCreateModalOpen(false);
        setNewCampaign(INITIAL_CAMPAIGN_STATE);
    }, []);

    const handleInputChange = useCallback((
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const {name, value, type} = e.target;
        const inputValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

        setNewCampaign(prev => ({
            ...prev,
            [name]: inputValue
        }));
    }, []);

    const handleCreateCampaign = useCallback(async () => {
        try {
            if (!newCampaign.name.trim()) {
                showNotification('Campaign name is required', 'error');
                return;
            }

            if (!newCampaign.external_id.trim()) {
                showNotification('External ID is required', 'error');
                return;
            }

            const createdCampaign = await campaignService.createOne(newCampaign);
            setCampaigns(prev => [createdCampaign, ...prev]);
            handleCreateModalClose();
            showNotification('Campaign created successfully', 'success');
        } catch (error) {
            console.error('Error creating campaign:', error);
            showNotification('Failed to create campaign', 'error');
        }
    }, [newCampaign, showNotification, handleCreateModalClose]);

    const handleSnackbarClose = useCallback(() => {
        setSnackbar(prev => ({...prev, open: false}));
    }, []);

    return (
        <Container maxWidth={false} sx={{height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0}}>
            <Box sx={{p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden'}}>
                <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
                    <Typography variant="h4" component="h2" sx={{fontWeight: 'bold'}}>
                        Campaigns
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon/>}
                        onClick={() => {
                            setCreateModalOpen(true)
                        }}
                    >
                        Create New
                    </Button>
                </Box>

                {loading
                    ? (
                        <Box sx={{display: 'flex', justifyContent: 'center', p: 4}}>
                            <CircularProgress/>
                        </Box>
                    )
                    : (
                        <Box sx={{display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden'}}>
                            <Box sx={{flexGrow: 1, overflow: 'auto', minHeight: 0}}>
                                <AdminCampaignsTable
                                    campaigns={campaigns}
                                    setCampaigns={setCampaigns}
                                />
                            </Box>
                            <Box sx={{backgroundColor: 'background.paper'}}>
                                <CustomPagination
                                    page={page}
                                    setPage={setPage}
                                    rows={campaignCount}
                                    limit={limit}
                                    setLimit={setLimit}
                                />
                            </Box>
                        </Box>
                    )}
            </Box>

            <Dialog
                open={createModalOpen}
                onClose={handleCreateModalClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogContent>
                    <Box sx={{mt: 2, display: 'flex', flexDirection: 'column', gap: 2}}>
                        <TextField
                            fullWidth
                            label="Campaign Name"
                            name="name"
                            value={newCampaign.name}
                            onChange={handleInputChange}
                            required
                        />
                        <TextField
                            fullWidth
                            label="External ID"
                            name="external_id"
                            value={newCampaign.external_id}
                            onChange={handleInputChange}
                            required
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={newCampaign.is_active}
                                    onChange={handleInputChange}
                                    name="is_active"
                                />
                            }
                            label="Active Campaign"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCreateModalClose}>Cancel</Button>
                    <Button
                        onClick={handleCreateCampaign}
                        variant="contained"
                        disabled={!newCampaign.name.trim()}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{vertical: 'top', horizontal: 'right'}}
            >
                <Alert
                    onClose={handleSnackbarClose}
                    severity={snackbar.severity}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminCampaignsSection;