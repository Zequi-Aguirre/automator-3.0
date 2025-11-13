import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Container,
    Snackbar,
    Alert
} from '@mui/material';
import AdminCampaignsTable from './adminCampaignsTable/AdminCampaignsTable';
import CustomPagination from '../../Pagination';
import campaignService from '../../../services/campaign.service';
import { Campaign } from '../../../types/campaignTypes';

const AdminCampaignsSection = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(100);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const showNotification = useCallback((message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const fetchCampaigns = useCallback(async () => {
        setLoading(true);
        try {
            const data = await campaignService.getAll();
            setCampaigns(data);
        } catch (err: never) {
            showNotification('Failed to fetch campaigns', 'error');
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    const handleSnackbarClose = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    return (
        <Container maxWidth={false} sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold' }}>
                        Campaigns
                    </Typography>
                </Box>

                {loading
                ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                )
                : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                        <Box sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
                            <AdminCampaignsTable campaigns={campaigns} setCampaigns={setCampaigns} />
                        </Box>
                        <Box sx={{ backgroundColor: 'background.paper' }}>
                            <CustomPagination
                                page={page}
                                setPage={setPage}
                                rows={campaigns.length}
                                limit={limit}
                                setLimit={setLimit}
                            />
                        </Box>
                    </Box>
                )}
            </Box>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminCampaignsSection;