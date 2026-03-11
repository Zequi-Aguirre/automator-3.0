import { useState } from 'react';
import { Alert, Box, Button, Chip, IconButton, Snackbar } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Cancel, CheckCircle } from '@mui/icons-material';
import StarIcon from '@mui/icons-material/Star';

import { Campaign } from '../../../../types/campaignTypes';
import { Source } from '../../../../types/sourceTypes';
import { LeadManager } from '../../../../types/leadManagerTypes';
import campaignService from '../../../../services/campaign.service';

interface Props {
    campaigns: Campaign[];
    setCampaigns: (campaigns: (prev: Campaign[]) => Campaign[]) => void;
    sources: Source[];
    managers: LeadManager[];
}

const PLATFORM_LABELS: Record<string, string> = {
    fb: 'Facebook',
    google: 'Google',
    tiktok: 'TikTok',
};

const AdminCampaignsTable = ({ campaigns, setCampaigns, sources, managers }: Props) => {
    const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success'
    });

    const updateMeta = async (id: string, updates: Partial<Pick<Campaign, 'blacklisted' | 'rating'>>) => {
        const updated = await campaignService.updateCampaignMeta(id, updates);
        setCampaigns((prev) => prev.map((c) => c.id === id ? updated : c));
    };

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Campaign Name',
            flex: 1,
            minWidth: 180,
        },
        {
            field: 'platform',
            headerName: 'Platform',
            width: 120,
            renderCell: (params) => {
                if (!params.value) return null;
                return (
                    <Chip
                        label={PLATFORM_LABELS[params.value] || params.value}
                        size="small"
                        variant="outlined"
                    />
                );
            }
        },
        {
            field: 'source_id',
            headerName: 'Source',
            width: 160,
            renderCell: (params) => {
                const source = sources.find((s) => s.id === params.value);
                return source?.name || '—';
            }
        },
        {
            field: 'lead_manager_id',
            headerName: 'Manager',
            width: 160,
            renderCell: (params) => {
                const manager = managers.find((m) => m.id === params.value);
                return manager?.name || '—';
            }
        },
        {
            field: 'rating',
            headerName: 'Rating',
            width: 220,
            sortable: false,
            renderCell: (params) => {
                const rating = params.value || 0;
                const id = params.row.id;
                const disabled = params.row.blacklisted === true;

                return (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <IconButton
                                key={star}
                                size="small"
                                disabled={disabled}
                                sx={{ color: star <= rating ? 'gold' : 'grey.400' }}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!disabled) await updateMeta(id, { rating: star });
                                }}
                            >
                                <StarIcon />
                            </IconButton>
                        ))}
                    </Box>
                );
            }
        },
        {
            field: 'blacklisted',
            headerName: 'Status',
            width: 140,
            renderCell: (params) => {
                const campaign = params.row;
                return (
                    <Button
                        variant="contained"
                        color={campaign.blacklisted ? 'error' : 'success'}
                        size="small"
                        onClick={async (e) => {
                            e.stopPropagation();
                            await updateMeta(campaign.id, { blacklisted: !campaign.blacklisted });
                        }}
                        startIcon={campaign.blacklisted ? <Cancel /> : <CheckCircle />}
                    >
                        {campaign.blacklisted ? 'Blacklisted' : 'Active'}
                    </Button>
                );
            }
        },
    ];

    return (
        <>
            <DataGrid
                rows={campaigns}
                columns={columns}
                disableRowSelectionOnClick
                hideFooter
                sx={{
                    "& .MuiDataGrid-cell": { py: 1 },
                    "& .MuiDataGrid-columnHeaders": { backgroundColor: "action.hover" },
                }}
            />
            <Snackbar
                open={snack.open}
                autoHideDuration={5000}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default AdminCampaignsTable;
