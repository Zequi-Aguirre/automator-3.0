import {useState} from 'react';
import {Alert, Box, Button, IconButton, Snackbar, Typography,} from '@mui/material';
import {DataGrid, GridColDef} from '@mui/x-data-grid';
import {Cancel, CheckCircle} from '@mui/icons-material';
import StarIcon from '@mui/icons-material/Star';
import {Link} from 'react-router-dom';

import {Campaign} from '../../../../types/campaignTypes';
import {Affiliate} from '../../../../types/affiliateTypes.ts';
import campaignService from '../../../../services/campaign.service';

interface Props {
    campaigns: Campaign[];
    setCampaigns: (campaigns: (prev: Campaign[]) => Campaign[]) => void;
    affiliates: Affiliate[];
}

const AdminCampaignsTable = ({ campaigns, setCampaigns, affiliates }: Props) => {
    const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const updateMeta = async (id: string, updates: Partial<Pick<Campaign, 'blacklisted' | 'rating'>>) => {
        const updated = await campaignService.updateCampaignMeta(id, updates);
        setCampaigns((prev) => {
            return prev.map((c) => {
                return c.id === id ? updated : c;
            });
        });
    };

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Campaign Name',
            flex: 1,
            minWidth: 180,
            maxWidth: 300
        },
        {
            field: 'rating',
            headerName: 'Rating',
            minWidth: 260,
            sortable: false,
            renderCell: (params) => {
                const rating = params.value || 0;
                const id = params.row.id;

                const affiliate = affiliates.find((a) => {
                    return a.id === params.row.affiliate_id;
                });

                const disabled = affiliate?.blacklisted === true || params.row.blacklisted === true;

                return (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {[1, 2, 3, 4, 5].map((star) => {
                            const color = disabled
                                ? 'grey.400'
                                : star <= rating
                                    ? 'gold'
                                    : 'grey.400';

                            return (
                                <IconButton
                                    key={star}
                                    size="small"
                                    disabled={disabled}
                                    sx={{ color }}
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!disabled) {
                                            await updateMeta(id, { rating: star });
                                        }
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
            minWidth: 300,
            renderCell: (params) => {
                const campaign = params.row;

                const affiliate = affiliates.find((a) => {
                    return a.id === campaign.affiliate_id;
                });

                const affiliateBlacklisted = affiliate?.blacklisted === true;

                if (affiliateBlacklisted) {
                    return (
                        <Button
                            variant="contained"
                            color="error"
                            component={Link}
                            to={`/a/affiliates/${affiliate?.id}`}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                            startIcon={<Cancel />}
                        >
                            Blacklisted Affiliate
                        </Button>
                    );
                }

                const isBlacklisted = campaign.blacklisted;

                return (
                    <Button
                        variant="contained"
                        color={(isBlacklisted ? 'error' : 'success') as 'error' | 'success'}
                        onClick={async (e) => {
                            e.stopPropagation();
                            await updateMeta(campaign.id, { blacklisted: !isBlacklisted });
                        }}
                        startIcon={isBlacklisted ? <Cancel /> : <CheckCircle />}
                    >
                        {isBlacklisted ? 'Blacklisted' : 'Active'}
                    </Button>
                );
            }
        },
        {
            field: 'affiliate_id',
            headerName: 'Affiliate',
            flex: 1,
            minWidth: 180,
            renderCell: (params) => {
                const affiliate = affiliates.find((a) => {
                    return a.id === params.value;
                });

                if (!affiliate) {
                    return <Typography>{params.value}</Typography>;
                }

                return (
                    <Button
                        component={Link}
                        to={`/a/affiliates/${affiliate.id}`}
                        size="small"
                        variant="text"
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        {affiliate.name}
                    </Button>
                );
            }
        }
    ];

    return (
        <>
            <DataGrid
                rows={campaigns}
                columns={columns}
                getRowId={(row) => {
                    return row.id;
                }}
                disableRowSelectionOnClick
                hideFooter
            />

            <Snackbar
                open={snack.open}
                autoHideDuration={5000}
                onClose={() => {
                    setSnack((s) => {
                        return { ...s, open: false };
                    });
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => {
                        setSnack((s) => {
                            return { ...s, open: false };
                        });
                    }}
                    severity={snack.severity}
                    sx={{ width: '100%' }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default AdminCampaignsTable;