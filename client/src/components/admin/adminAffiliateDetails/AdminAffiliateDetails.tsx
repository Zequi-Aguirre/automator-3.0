import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    CircularProgress,
    Alert,
    Button,
    IconButton,
    Snackbar
} from '@mui/material';
import { Cancel, CheckCircle, Star } from '@mui/icons-material';
import {Affiliate} from "../../../types/affiliateTypes.ts";
import affiliateService from "../../../services/affiliate.service.tsx";
import AffiliateCampaignsTable from "./affiliateCampaignsTable/AffiliateCampaignsTable.tsx";

const AdminAffiliateDetails = () => {
    const { id } = useParams<{ id: string }>();
    const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const showMessage = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const fetchAffiliate = async () => {
        try {
            if (!id) {
                return;
            }
            const data = await affiliateService.getById(id);
            setAffiliate(data);
        } catch (error) {
            showMessage('Failed to fetch affiliate.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const updateMeta = async (updates: Partial<Pick<Affiliate, 'rating' | 'blacklisted'>>) => {
        try {
            if (!affiliate) {
                return;
            }
            const updated = await affiliateService.updateAffiliateMeta(affiliate.id, updates);
            setAffiliate(updated);
            showMessage('Affiliate updated successfully', 'success');
        } catch (err) {
            showMessage('Failed to update affiliate', 'error');
        }
    };

    useEffect(() => {
        fetchAffiliate();
    }, [id]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!affiliate) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">Affiliate not found</Alert>
            </Box>
        );
    }

    const disabled = affiliate.blacklisted;

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>
                {affiliate.name}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                {[1, 2, 3, 4, 5].map((star) => {
                    const color = disabled
                        ? 'grey.400'
                        : star <= affiliate.rating
                            ? 'gold'
                            : 'grey.400';

                    return (
                        <IconButton
                            key={star}
                            disabled={disabled}
                            onClick={async () => {
                                if (!disabled) {
                                    await updateMeta({ rating: star });
                                }
                            }}
                            size="large"
                            sx={{ color }}
                        >
                            <Star />
                        </IconButton>
                    );
                })}

                <Button
                    onClick={async () => {
                        if (affiliate) {
                            await updateMeta({ blacklisted: !affiliate.blacklisted });
                        }
                    }}
                    variant="contained"
                    color={(affiliate.blacklisted ? 'error' : 'success') as 'error' | 'success'}
                    startIcon={affiliate.blacklisted ? <Cancel /> : <CheckCircle />}
                >
                    {affiliate.blacklisted ? 'Blacklisted' : 'Active'}
                </Button>
            </Box>

            <AffiliateCampaignsTable affiliateId={affiliate.id} affiliate={affiliate} />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={() => {
                    setSnackbar((s) => {
                        return { ...s, open: false };
                    });
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => {
                        setSnackbar((s) => {
                            return { ...s, open: false };
                        });
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

export default AdminAffiliateDetails;