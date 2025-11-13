import { useState } from 'react';
import {
    Box,
    Typography,
    Container,
    Snackbar,
    Alert,
    IconButton,
    Button
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import StarIcon from '@mui/icons-material/Star';
import { Campaign } from '../../../../types/campaignTypes';
import campaignService from '../../../../services/campaign.service';

interface Props {
    campaigns: Campaign[];
    setCampaigns: (campaigns: (prev) => never) => void;
}

const AdminCampaignsTable = ({ campaigns, setCampaigns }: Props) => {
    const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const updateMeta = async (id: string, updates: Partial<Pick<Campaign, 'blacklisted' | 'rating'>>) => {
        try {
            const updated = await campaignService.updateCampaignMeta(id, updates);
            setCampaigns(prev => prev.map(c => (c.id === id ? updated : c)));
        } catch (err: never) {
            setSnack({ open: true, message: err?.message || 'Update failed', severity: 'error' });
        }
    };

    return (
        <Container maxWidth="lg" sx={{ pt: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {campaigns.map((c) => (
                    <Box
                        key={c.id}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 2,
                            border: '1px solid #ccc',
                            borderRadius: 2
                        }}
                    >
                        <Typography variant="subtitle1" sx={{ flex: 1 }}>{c.name}</Typography>
                        <Typography variant="subtitle1" sx={{ flex: 1 }}>{c.affiliate_id}</Typography>

                        {/* Blacklist toggle */}
                        <Button
                            onClick={async () => {
                                await updateMeta(c.id, { blacklisted: !c.blacklisted });
                            }}
                            variant="contained"
                            color={(c.blacklisted ? 'error' : 'success') as 'error' | 'success'}
                            startIcon={c.blacklisted ? <Cancel /> : <CheckCircle />}
                        >
                            {c.blacklisted ? 'Blacklisted' : 'Active'}
                        </Button>

                        {/* Rating Stars */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, marginLeft: '20px' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <IconButton
                                    key={star}
                                    onClick={async () => {
                                        await updateMeta(c.id, { rating: star });
                                    }}
                                    size="small"
                                    sx={{ color: c.blacklisted ? 'grey.400' : (star <= c.rating ? 'gold' : 'grey.400') }}
                                >
                                    <StarIcon />
                                </IconButton>
                            ))}
                        </Box>
                    </Box>
                ))}
            </Box>

            <Snackbar
                open={snack.open}
                autoHideDuration={5000}
                onClose={() => {
                    setSnack((s) => ({ ...s, open: false }));
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => {
                        setSnack((s) => ({ ...s, open: false }));
                    }}
                    severity={snack.severity}
                    sx={{ width: '100%' }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminCampaignsTable;