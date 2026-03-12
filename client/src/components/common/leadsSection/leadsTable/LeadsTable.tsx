import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Button, Snackbar, Alert, Typography, IconButton, Badge, Chip } from "@mui/material";
import { Groups as GroupsIcon, PlayArrow as PlayArrowIcon } from "@mui/icons-material";
import { Lead } from "../../../../types/leadTypes.ts";
import { useNavigate } from "react-router-dom";
import leadsService from "../../../../services/lead.service.tsx";
import {useContext, useEffect, useState} from "react";
import { DateTime } from "luxon";
import {
    remainingMs,
    formatRemaining,
    getUrgency,
    colorForUrgency,
} from "../../../../utils/leadExpiry";
import { parseUtcToZone } from "../../../../utils/dates.ts"; // adjust the relative path if needed
import workingsService from "../../../../services/settings.service.tsx";
import DataContext from "../../../../context/DataContext.tsx";
import BuyerSendModal from "../../leadDetails/buyerSendModal/BuyerSendModal.tsx";

interface LeadsTableProps {
    leads: Lead[];
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
}

const LeadsTable = ({ leads, setLeads }: LeadsTableProps) => {
    const navigate = useNavigate();
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success" as "success" | "error",
    });
    const [buyerModalOpen, setBuyerModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    // one ticking clock for all rows
    const [now, setNow] = useState(DateTime.utc());
    const [leadExpireHours, setLeadExpireHours] = useState(18); // default to 18 hours
    const { role } = useContext(DataContext)
    const isAdmin = role.includes('admin')

    useEffect(() => {
        // Fetch worker settings to get expire_after_hours
        const fetchSettings = async () => {
            try {
                const settings = await workingsService.getWorkerSettings();
                setLeadExpireHours(settings.expire_after_hours);
            } catch (error) {
                console.error("Error fetching worker settings:", error);
            }
        };
        fetchSettings();

        const id = setInterval(() => {
            setNow(DateTime.utc());
        }, 60_000);
        return () => {
            clearInterval(id);
        };
    }, []);

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const showNotification = (message: string, severity: "success" | "error") => {
        setSnackbar({
            open: true,
            message,
            severity,
        });
    };

    const handleTrashLead = async (leadId: string) => {
        try {
            const leadDeleted = await leadsService.trashLead(leadId);
            setLeads((prevLeads) => prevLeads.filter((lead) => lead.id !== leadDeleted.id));
            showNotification("Lead moved to trash successfully", "success");
        } catch (error) {
            showNotification("Failed to trash lead", "error");
            console.error("Error trashing the lead:", error);
        }
    };

    const handleOpenBuyerModal = (lead: Lead) => {
        setSelectedLead(lead);
        setBuyerModalOpen(true);
    };

    const handleCloseBuyerModal = () => {
        setBuyerModalOpen(false);
        setSelectedLead(null);
    };

    const handleRefreshLead = async () => {
        if (!selectedLead) return;
        try {
            const updatedLead = await leadsService.getLeadById(selectedLead.id);
            setLeads(prevLeads =>
                prevLeads.map(l => l.id === updatedLead.id ? updatedLead : l)
            );
            setSelectedLead(updatedLead);
        } catch (error) {
            console.error("Error refreshing lead:", error);
        }
    };

    const handleRowClick = (params: Lead) => {
        navigate(`/${isAdmin ? 'a' : 'u'}/leads/${params.id}`);
    };

    const rows = leads.map((lead) => ({
        id: lead.id,
        name: `${lead.first_name} ${lead.last_name}`,
        contact: {
            phone: lead.phone,
            email: lead.email,
        },
        location: {
            address: lead.address,
            city: lead.city,
            state: lead.state,
            zipcode: lead.zipcode,
        },
        county: lead.county ?? "No county saved",
        state: lead.state,
        daySent: parseUtcToZone(lead.sent_date),
        created: parseUtcToZone(lead.created),
        raw: lead,
    }));

    const columns: GridColDef[] = [
        {
            field: "name",
            headerName: "Name",
            flex: 1,
            sortingOrder: ["asc", "desc"],
            renderCell: (params) => (
                <Typography
                    className="cursor-pointer hover:underline"
                    color="primary"
                    onClick={() => {
                        handleRowClick(params.row);
                    }}
                >
                    {params.value}
                </Typography>
            ),
        },
        {
            field: "contact",
            headerName: "Contact",
            flex: 1.5,
            sortingOrder: ["asc", "desc"],
            renderCell: (params) => (
                <div className="flex flex-col">
                    <Typography variant="body2">{params.value.phone}</Typography>
                    <Typography variant="body2">{params.value.email}</Typography>
                </div>
            ),
        },
        {
            field: "location",
            headerName: "Address",
            flex: 1.5,
            sortingOrder: ["asc", "desc"],
            renderCell: (params) => (
                <div className="flex flex-col">
                    <Typography variant="body2">{params.value.address}</Typography>
                    <Typography variant="body2">
                        {params.value.city}, {params.value.state} {params.value.zipcode}
                    </Typography>
                </div>
            ),
        },
        { field: "county", headerName: "County", flex: 1, sortingOrder: ["asc", "desc"] },
        { field: "state", headerName: "State", flex: 0.7 },
        {
            field: "created",
            headerName: "Received",
            flex: 1,
            sortable: false,
            filterable: false,
            renderCell: (params) =>
                params.value
                ? (
                    <div className="flex flex-col">
                        <Typography variant="body2">{params.value.date}</Typography>
                        <Typography variant="body2">{params.value.time}</Typography>
                    </div>
                )
                : (
                    "N/A"
                ),
        },
        {
            field: "expires_in",
            headerName: "Expires In",
            flex: 1.1,
            sortable: false,
            filterable: false,
            renderCell: (params: GridRenderCellParams) => {
                const importedISO: string | null = params.row.raw?.created ?? null;
                if (!importedISO) return "—";
                const ms = remainingMs(importedISO, now, leadExpireHours);
                const label = formatRemaining(ms);
                const urgency = getUrgency(ms);
                const color = colorForUrgency(urgency);
                return (
                    <Typography variant="body2" sx={{ color, fontWeight: urgency === "expired" ? 700 : 500 }}>
                        {label}
                    </Typography>
                );
            },
        },
        {
            field: "verified",
            headerName: "Verify",
            flex: 1,
            sortable: false,
            filterable: false,
            renderCell: (params: GridRenderCellParams) => {
                const isVerified: boolean = !!params.row.raw?.verified;

                // If not verified, show verify button
                if (!isVerified) {
                    return (
                        <Button
                            variant="contained"
                            color="warning"
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/${isAdmin ? 'a' : 'u'}/leads/${params.row.id}`);
                            }}
                        >
                            Verify Lead
                        </Button>
                    );
                }

                // Verified: show checkmark
                return (
                    <Chip
                        label="Verified"
                        color="success"
                        size="small"
                    />
                );
            },
        },
        {
            field: "buyers",
            headerName: "Buyers",
            flex: 0.8,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <IconButton
                    size="small"
                    color="primary"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleOpenBuyerModal(params.row.raw);
                    }}
                    title="Send to buyers"
                >
                    <Badge badgeContent={0} color="secondary">
                        <GroupsIcon />
                    </Badge>
                </IconButton>
            ),
        },
        {
            field: "worker",
            headerName: "Worker",
            flex: 0.7,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                params.row.raw?.worker_enabled ? (
                    <Chip
                        icon={<PlayArrowIcon />}
                        label="Queued"
                        color="success"
                        size="small"
                    />
                ) : (
                    <Chip
                        label="Not Queued"
                        variant="outlined"
                        size="small"
                    />
                )
            ),
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 0.5,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <Button
                    variant="contained"
                    color="error"
                    size="small"
                    disabled={params.row.raw?.sent}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleTrashLead(params.row.id);
                    }}
                >
                    Trash
                </Button>
            ),
        },
    ];

    return (
        <>
            <DataGrid
                rows={rows}
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

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {selectedLead && (
                <BuyerSendModal
                    open={buyerModalOpen}
                    onClose={handleCloseBuyerModal}
                    lead={selectedLead}
                    onRefresh={handleRefreshLead}
                />
            )}
        </>
    );
};

export default LeadsTable;