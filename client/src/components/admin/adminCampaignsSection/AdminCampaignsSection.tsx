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
import { Source } from '../../../types/sourceTypes';
import { LeadManager } from '../../../types/leadManagerTypes';

const AdminCampaignsSection = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [sources, setSources] = useState<Source[]>([]);
    const [managers, setManagers] = useState<LeadManager[]>([]);
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
            const data = await campaignService.getMany({ page, limit });
            setCampaigns(data.campaigns);
            setSources(data.sources);
            setManagers(data.managers);
        } catch {
            showNotification('Failed to fetch campaigns', 'error');
        } finally {
            setLoading(false);
        }
    }, [showNotification, page, limit]);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    return (
        <Container maxWidth={false} sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold' }}>
                        Campaigns
                    </Typography>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                        <Box sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
                            <AdminCampaignsTable
                                campaigns={campaigns}
                                setCampaigns={setCampaigns}
                                sources={sources}
                                managers={managers}
                            />
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
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminCampaignsSection;
