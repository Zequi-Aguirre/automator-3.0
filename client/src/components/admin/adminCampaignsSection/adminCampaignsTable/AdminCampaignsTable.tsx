import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Button, Snackbar, Alert, Typography, Box, styled } from "@mui/material";
import { faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Campaign } from "../../../../types/campaignTypes.ts";
import { Link } from "react-router-dom";
import campaignService from "../../../../services/campaign.service";
import { useState } from "react";

interface CampaignsTableProps {
    campaigns: Campaign[];
    setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
}

const AdminCampaignsTable = ({ campaigns, setCampaigns }: CampaignsTableProps) => {
    const [loadingCampaigns, setLoadingCampaigns] = useState<Record<string, boolean>>({});
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const showNotification = (message: string, severity: 'success' | 'error') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    const handleToggleActive = async (campaignId: string, currentStatus: boolean) => {
        setLoadingCampaigns(prev => ({ ...prev, [campaignId]: true }));

        try {
            const updatedCampaign = await campaignService.updateCampaignStatus(
                campaignId,
                !currentStatus
            );

            setCampaigns((prevCampaigns) =>
                prevCampaigns.map((campaign) =>
                    campaign.id === campaignId ? updatedCampaign : campaign
                )
            );
            showNotification('Campaign status updated successfully', 'success');
        } catch (error) {
            showNotification('Failed to update campaign status', 'error');
            console.error("Error updating campaign status:", error);
        } finally {
            setLoadingCampaigns(prev => ({ ...prev, [campaignId]: false }));
        }
    };

    const StatusCircle = styled(Box)<{ isActive: boolean }>(({ theme, isActive }) => ({
        width: 32,
        height: 32,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isActive ? theme.palette.success.main : theme.palette.error.main,
        color: theme.palette.common.white,
        '& svg': {
            fontSize: 16
        }
    }));

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Name',
            flex: 1,
            sortingOrder: ['asc', 'desc'],
            renderCell: (params) => (
                <Typography>
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'external_id',
            headerName: 'External ID',
            flex: 1,
            sortingOrder: ['asc', 'desc']
        },
        {
            field: 'is_active',
            headerName: 'Active',
            flex: 1,
            sortingOrder: ['asc', 'desc'],
            renderCell: (params) => (
                <Box display="flex" alignItems="center" justifyContent="center">
                    <StatusCircle isActive={params.value}>
                        <FontAwesomeIcon
                            icon={params.value ? faCheck : faTimes}
                        />
                    </StatusCircle>
                </Box>
            )
        },
        {
            field: 'action',
            headerName: 'Action',
            flex: 1,
            sortable: false,
            renderCell: (params) => {
                const getButtonColor = (isActive: boolean): "success" | "error" => {
                    return !isActive ? "success" : "error";
                };

                return (
                    <Button
                        variant="contained"
                        color={getButtonColor(params.row.is_active)}
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(params.row.id, params.row.is_active);
                        }}
                        disabled={loadingCampaigns[params.row.id]}
                    >
                        {params.row.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                );
            }
        },
        {
            field: 'details',
            headerName: 'Details',
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <Button
                    component={Link}
                    to={`/a/campaigns/${params.row.id}`}
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation()
                    }}
                >
                    Details
                </Button>
            )
        }
    ];

    return (
        <>
            <DataGrid
                rows={campaigns}
                columns={columns}
                disableRowSelectionOnClick
                hideFooter
                autoHeight
                sx={{
                    '& .MuiDataGrid-cell': {
                        py: 2
                    },
                    '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: 'action.hover'
                    }
                }}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default AdminCampaignsTable;