import {DataGrid, GridColDef, GridRenderCellParams} from "@mui/x-data-grid";
import {Button, Snackbar, Alert, Typography} from "@mui/material";
import {Lead} from "../../../../types/leadTypes.ts";
import {Link, useNavigate} from "react-router-dom";
import leadsService from "../../../../services/lead.service.tsx";
import {useState} from "react";

interface LeadsTableProps {
    leads: Lead[];
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
}

const AdminLeadsTable = ({leads, setLeads}: LeadsTableProps) => {
    const navigate = useNavigate();
    const [loadingLeads, setLoadingLeads] = useState<Record<string, boolean>>({});
    const [snackbar, setSnackbar] = useState({open: false, message: '', severity: 'success' as 'success' | 'error'});

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({...prev, open: false}));
    };

    const showNotification = (message: string, severity: 'success' | 'error') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    const handleTrashLead = async (leadId: string) => {
        try {
            // Pass oldDatabase flag to trashLead service
            const leadDeleted = await leadsService.trashLead(leadId);
            setLeads((prevLeads) => prevLeads.filter((lead) => lead.id !== leadDeleted.id));
            showNotification('Lead moved to trash successfully', 'success');
        } catch (error) {
            showNotification('Failed to trash lead', 'error');
            console.error("Error trashing the lead:", error);
        }
    };

    const handleSendLead = async (leadId: string) => {
        setLoadingLeads(prev => ({...prev, [leadId]: true}));

        try {
            // Pass oldDatabase flag to sendLead service
            const sendLeadResponse = await leadsService.sendLead(leadId);
            if (sendLeadResponse.success) {
                setLeads((prevLeads) => prevLeads.filter((lead) => lead.id !== leadId));
                showNotification('Lead sent successfully', 'success');
            } else {
                setLeads((prevLeads) => prevLeads.filter((lead) => lead.id !== leadId));
                showNotification(sendLeadResponse.message || 'Failed to send lead', 'error');
            }
        } catch (error) {
            showNotification('Failed to send lead', 'error');
            console.error("Error sending the lead:", error);
        } finally {
            setLoadingLeads(prev => ({...prev, [leadId]: false}));
        }
    };

    const handleRowClick = (params: Lead) => {
        // Include oldDatabase parameter in navigation
        navigate(`/a/leads/${params.id}`);
    };

    const rows = leads.map((lead) => ({
        id: lead.id,
        name: `${lead.first_name} ${lead.last_name}`,
        contact: {
            phone: lead.phone,
            email: lead.email
        },
        location: {
            address: lead.address,
            city: lead.city,
            state: lead.state,
            zipcode: lead.zipcode
        },
        county: lead.county ?? "No county saved",
        state: lead.state,
        dayReceived: lead.created
            ? {
                date: lead.created.slice(0, 10),
                time: lead.created.slice(11, 16)
            }
            : null,
        daySent: lead.buyer_lead?.ping_date
            ? {
                date: lead.buyer_lead.ping_date.slice(0, 10),
                time: lead.buyer_lead.ping_date.slice(11, 16)
            }
            : null,
        buyer_lead: lead.buyer_lead,
        raw: lead
    }));

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Name',
            flex: 1,
            sortingOrder: ['asc', 'desc'],
            renderCell: (params) => (
                <Typography
                    className="cursor-pointer hover:underline"
                    color="primary"
                    onClick={() => {
                        handleRowClick(params.row)
                    }}
                >
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'contact',
            headerName: 'Contact',
            flex: 1.5,
            sortingOrder: ['asc', 'desc'],
            renderCell: (params) => (
                <div className="flex flex-col">
                    <Typography variant="body2">{params.value.phone}</Typography>
                    <Typography variant="body2">{params.value.email}</Typography>
                </div>
            )
        },
        {
            field: 'location',
            headerName: 'Address',
            flex: 1.5,
            sortingOrder: ['asc', 'desc'],
            renderCell: (params) => (
                <div className="flex flex-col">
                    <Typography variant="body2">{params.value.address}</Typography>
                    <Typography variant="body2">
                        {params.value.city}, {params.value.state} {params.value.zipcode}
                    </Typography>
                </div>
            )
        },
        {
            field: 'county',
            headerName: 'County',
            flex: 1,
            sortingOrder: ['asc', 'desc'],
        },
        {
            field: 'state',
            headerName: 'State',
            flex: 0.7
        },
        {
            field: 'dayReceived',
            headerName: 'Received',
            flex: 1,
            sortable: false,
            filterable: false,
            renderCell: (params) => params.value
                ? (
                    <div className="flex flex-col">
                        <Typography variant="body2">{params.value.date}</Typography>
                        <Typography variant="body2">{params.value.time}</Typography>
                    </div>
                )
                : 'N/A'
        },
        {
            field: 'daySent',
            headerName: 'Sent',
            flex: 1.2,
            sortable: false,
            filterable: false,
            renderCell: (params: GridRenderCellParams) => {
                if (params.value) {
                    return (
                        <div className="flex flex-col">
                            <Typography variant="body2">{params.value.date}</Typography>
                            <Typography variant="body2">{params.value.time}</Typography>
                        </div>
                    );
                }

                const getButtonColor = (isLoading: boolean): "primary" | "error" => {
                    return !isLoading ? "primary" : "error";
                };

                return (
                    <Button
                        variant="contained"
                        color={getButtonColor(loadingLeads[params.row.id])}
                        size="small"
                        disabled={loadingLeads[params.row.id]}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSendLead(params.row.id);
                        }}
                    >
                        {loadingLeads[params.row.id] ? "Processing..." : "Send Now!"}
                    </Button>
                );
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            flex: 1,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <div className="flex gap-2">
                    <Button
                        component={Link}
                        to={`/a/leads/${params.row.id}`}
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    >
                        Details
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        size="small"
                        sx={{marginLeft: '20px'}}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleTrashLead(params.row.id);
                        }}
                    >
                        Trash
                    </Button>
                </div>
            )
        }
    ];

    return (
        <>
            <DataGrid
                rows={rows}
                columns={columns}
                disableRowSelectionOnClick
                hideFooter
                onSortModelChange={(params) => {
                    console.log('Sort model changed:', params[0]);
                }}
                onFilterModelChange={(params) => {
                    console.log('Filter model changed:', params);
                }}
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
                anchorOrigin={{vertical: 'top', horizontal: 'right'}}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{width: '100%'}}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default AdminLeadsTable;