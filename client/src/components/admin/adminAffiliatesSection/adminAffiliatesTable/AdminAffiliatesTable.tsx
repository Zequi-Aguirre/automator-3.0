import {
    Box,
    Button,
    Typography,
    IconButton
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Cancel, CheckCircle, Star } from '@mui/icons-material';
import { Link } from 'react-router-dom';

import { Affiliate } from '../../../../types/affiliateTypes';
import affiliateService from '../../../../services/affiliate.service';

interface Props {
    affiliates: Affiliate[];
    setAffiliates: (fn: (prev: Affiliate[]) => Affiliate[]) => void;
}

const AdminAffiliatesTable = ({ affiliates, setAffiliates }: Props) => {
    const updateMeta = async (id: string, updates: Partial<Pick<Affiliate, 'rating' | 'blacklisted'>>) => {
        const updated = await affiliateService.updateAffiliateMeta(id, updates);

        setAffiliates((prev) => {
            return prev.map((a) => {
                return a.id === id ? updated : a;
            });
        });
    };

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Affiliate',
            flex: 1,
            minWidth: 200,
            maxWidth: 400,
            renderCell: (params) => {
                return (
                    <Typography sx={{ fontWeight: 500 }}>
                        {params.row.name}
                    </Typography>
                );
            }
        },
        {
            field: 'rating',
            headerName: 'Rating',
            minWidth: 240,
            sortable: false,
            renderCell: (params) => {
                const affiliate: Affiliate = params.row;
                const disabled = affiliate.blacklisted;

                return (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!disabled) {
                                            await updateMeta(affiliate.id, { rating: star });
                                        }
                                    }}
                                    size="small"
                                    sx={{ color }}
                                >
                                    <Star />
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
            minWidth: 180,
            renderCell: (params) => {
                const affiliate: Affiliate = params.row;

                return (
                    <Button
                        variant="contained"
                        color={(affiliate.blacklisted ? 'error' : 'success') as 'error' | 'success'}
                        onClick={async (e) => {
                            e.stopPropagation();
                            await updateMeta(affiliate.id, { blacklisted: !affiliate.blacklisted });
                        }}
                        startIcon={affiliate.blacklisted ? <Cancel /> : <CheckCircle />}
                    >
                        {affiliate.blacklisted ? 'Blacklisted' : 'Active'}
                    </Button>
                );
            }
        },
        {
            field: 'details',
            headerName: 'Details',
            minWidth: 160,
            sortable: false,
            renderCell: (params) => {
                const affiliate: Affiliate = params.row;
                return (
                    <Button
                        component={Link}
                        to={`/a/affiliates/${affiliate.id}`}
                        variant="outlined"
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        Details
                    </Button>
                );
            }
        }
    ];

    return (
            <DataGrid
                rows={affiliates}
                columns={columns}
                disableRowSelectionOnClick
                hideFooter
                onSortModelChange={(params) => {
                    console.log("Sort model changed:", params[0]);
                }}
                onFilterModelChange={(params) => {
                    console.log("Filter model changed:", params);
                }}
                sx={{
                    "& .MuiDataGrid-cell": { py: 2 },
                    "& .MuiDataGrid-columnHeaders": { backgroundColor: "action.hover" },
                }}
            />
    );
};

export default AdminAffiliatesTable;