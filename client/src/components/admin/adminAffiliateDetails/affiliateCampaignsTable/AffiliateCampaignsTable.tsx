import { useEffect, useState } from 'react';
import {
    Box,
    Alert,
    Snackbar,
    Typography,
    CircularProgress,
    IconButton,
    Button
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import StarIcon from '@mui/icons-material/Star';
import { CheckCircle, Cancel } from '@mui/icons-material';

import campaignService from '../../../../services/campaign.service';
import { Campaign } from '../../../../types/campaignTypes';
import { Affiliate } from '../../../../types/affiliateTypes';

interface Props {
    affiliateId: string;
    affiliate: Affiliate;
}

const AffiliateCampaignsTable = ({ affiliateId, affiliate }: Props) => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    const [snack, setSnack] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const load = async () => {
        try {
            setLoading(true);
            const data = await campaignService.getBySource(affiliateId);
            setCampaigns(data.campaigns);
        } catch (err) {
            setSnack({
                open: true,
                severity: 'error',
                message: 'Failed to fetch campaigns'
            });
        } finally {
            setLoading(false);
        }
    };

    const updateMeta = async (id: string, updates: Partial<Pick<Campaign, 'blacklisted' | 'rating'>>) => {
        try {
            const updated = await campaignService.updateCampaignMeta(id, updates);
            setCampaigns((prev) => {
                return prev.map((c) => {
                    return c.id === id ? updated : c;
                });
            });
        } catch (err: unknown) {
            setSnack({ open: true, severity: 'error', message: 'Failed to update campaign' });
        }
    };

    useEffect(() => {
        load();
    }, [affiliateId]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Campaign',
            flex: 1,
            minWidth: 180
        },
        {
            field: 'rating',
            headerName: 'Rating',
            minWidth: 230,
            renderCell: (params) => {
                const rating = params.value || 0;
                const id = params.row.id;

                return (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {[1, 2, 3, 4, 5].map((star) => {
                            const color =
                                star <= rating ? 'gold' : 'grey.400';

                            return (
                                <IconButton
                                    key={star}
                                    size="small"
                                    sx={{ color }}
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await updateMeta(id, { rating: star });
                                    }}
                                >
                                    <StarIcon />
                                </IconButton>
                            );
                        })}
                    </Box>
                );
            }
        },
        {
            field: 'blacklisted',
            headerName: 'Status',
            minWidth: 200,
            renderCell: (params) => {
                const isBlacklisted = params.row.blacklisted;
                const id = params.row.id;

                return (
                    <Button
                        variant="contained"
                        color={(isBlacklisted ? 'error' : 'success') as 'error' | 'success'}
                        startIcon={isBlacklisted ? <Cancel /> : <CheckCircle />}
                        onClick={async (e) => {
                            e.stopPropagation();
                            await updateMeta(id, { blacklisted: !isBlacklisted });
                        }}
                    >
                        {isBlacklisted ? 'Blacklisted' : 'Active'}
                    </Button>
                );
            }
        }
    ];

    return (
        <>
            {affiliate.blacklisted && (
                <Alert severity="error" sx={{ mb: 2, fontWeight: 'bold' }}>
                    This affiliate is blacklisted. All campaigns below are currently inactive until the affiliate is reinstated.
                </Alert>
            )}

            <Typography variant="h6" sx={{ mb: 2 }}>
                Campaigns for {affiliate.name}
            </Typography>

            <DataGrid
                rows={campaigns}
                columns={columns}
                autoHeight
                disableRowSelectionOnClick
                getRowId={(row) => row.id}
                hideFooter
            />

            <Snackbar
                open={snack.open}
                autoHideDuration={5000}
                onClose={() => { setSnack(s => ({ ...s, open: false })); }}
            >
                <Alert severity={snack.severity}>{snack.message}</Alert>
            </Snackbar>
        </>
    );
};

export default AffiliateCampaignsTable;