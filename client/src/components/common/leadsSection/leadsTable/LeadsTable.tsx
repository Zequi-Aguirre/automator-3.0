import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
    Alert,
    Box,
    Chip,
    IconButton,
    Snackbar,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    CheckCircle as CheckCircleIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Groups as GroupsIcon,
    PlayArrow as PlayArrowIcon,
    Stop as StopIcon,
    VerifiedUser as VerifiedIcon,
} from "@mui/icons-material";
import { Lead } from "../../../../types/leadTypes.ts";
import { useNavigate } from "react-router-dom";
import leadsService from "../../../../services/lead.service.tsx";
import { useContext, useEffect, useState } from "react";
import { DateTime } from "luxon";
import {
    remainingMs,
    formatRemaining,
    getUrgency,
    colorForUrgency,
} from "../../../../utils/leadExpiry";
import { parseUtcToZone } from "../../../../utils/dates.ts";
import workingsService from "../../../../services/settings.service.tsx";
import DataContext from "../../../../context/DataContext.tsx";
import BuyerSendModal from "../../leadDetails/buyerSendModal/BuyerSendModal.tsx";
import { usePermissions } from "../../../../hooks/usePermissions.ts";
import { Permission } from "../../../../types/userTypes.ts";

interface LeadsTableProps {
    leads: Lead[];
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
}

const LeadsTable = ({ leads, setLeads }: LeadsTableProps) => {
    const navigate = useNavigate();
    const { can } = usePermissions();
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success" as "success" | "error",
    });
    const [buyerModalOpen, setBuyerModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [now, setNow] = useState(DateTime.utc());
    const [leadExpireHours, setLeadExpireHours] = useState(18);
    const { role } = useContext(DataContext);
    const isAdmin = role.includes("admin");

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await workingsService.getWorkerSettings();
                setLeadExpireHours(settings.expire_after_hours);
            } catch {
                // use default
            }
        };
        void fetchSettings();
        const id = setInterval(() => { setNow(DateTime.utc()); }, 60_000);
        return () => { clearInterval(id); };
    }, []);

    const showNotification = (message: string, severity: "success" | "error") => {
        setSnackbar({ open: true, message, severity });
    };

    const handleVerifyToggle = async (lead: Lead) => {
        try {
            if (lead.verified) {
                const updated = await leadsService.unverifyLead(lead.id);
                setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
                showNotification("Lead unverified", "success");
            } else {
                navigate(`/${isAdmin ? "a" : "u"}/leads/${lead.id}`);
            }
        } catch {
            showNotification("Failed to update verification", "error");
        }
    };

    const handleQueueToggle = async (lead: Lead) => {
        try {
            if (lead.worker_enabled) {
                const updated = await leadsService.unqueueLead(lead.id);
                setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
                showNotification("Lead removed from queue", "success");
            } else {
                const updated = await leadsService.queueLead(lead.id);
                setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
                showNotification("Lead queued for worker", "success");
            }
        } catch {
            showNotification("Failed to update queue", "error");
        }
    };

    const handleTrashLead = async (leadId: string) => {
        try {
            const deleted = await leadsService.trashLead(leadId);
            setLeads(prev => prev.filter(l => l.id !== deleted.id));
            showNotification("Lead moved to trash", "success");
        } catch {
            showNotification("Failed to trash lead", "error");
        }
    };

    const handleOpenBuyerModal = (lead: Lead) => {
        setSelectedLead(lead);
        setBuyerModalOpen(true);
    };

    const handleRefreshLead = async () => {
        if (!selectedLead) return;
        try {
            const updated = await leadsService.getLeadById(selectedLead.id);
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
            setSelectedLead(updated);
        } catch {
            // ignore
        }
    };

    const platformLabel = (platform: string | null): string => {
        const map: Record<string, string> = {
            fb: "FB",
            facebook: "FB",
            google: "Google",
            tiktok: "TikTok",
            instagram: "IG",
            youtube: "YT",
        };
        if (!platform) return "";
        return map[platform.toLowerCase()] ?? platform.toUpperCase();
    };

    const rows = leads.map((lead) => ({
        id: lead.id,
        raw: lead,
        name: `${lead.first_name} ${lead.last_name}`,
        contact: { phone: lead.phone, email: lead.email },
        address: { address: lead.address, city: lead.city, zipcode: lead.zipcode },
        countyState: `${lead.county ?? "—"}, ${lead.state}`,
        created: parseUtcToZone(lead.created),
        campaign: lead.campaign_name
            ? [platformLabel(lead.campaign_platform), lead.campaign_name].filter(Boolean).join(" - ")
            : null,
    }));

    const columns: GridColDef[] = [
        {
            field: "name",
            headerName: "Name",
            flex: 0.8,
            renderCell: (params) => (
                <Typography
                    variant="body2"
                    color="primary"
                    sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                    onClick={() => { navigate(`/${isAdmin ? "a" : "u"}/leads/${params.row.id}`); }}
                >
                    {params.value}
                </Typography>
            ),
        },
        {
            field: "contact",
            headerName: "Contact",
            flex: 1.1,
            sortable: false,
            renderCell: (params) => (
                <Box>
                    <Typography variant="body2">{params.value.phone}</Typography>
                    <Typography variant="caption" color="text.secondary">{params.value.email}</Typography>
                </Box>
            ),
        },
        {
            field: "address",
            headerName: "Address",
            flex: 1.2,
            sortable: false,
            renderCell: (params) => (
                <Box>
                    <Typography variant="body2">{params.value.address}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {params.value.city} {params.value.zipcode}
                    </Typography>
                </Box>
            ),
        },
        {
            field: "countyState",
            headerName: "County",
            flex: 0.9,
        },
        {
            field: "campaign",
            headerName: "Campaign",
            flex: 1.1,
            sortable: false,
            renderCell: (params) => (
                params.value
                    ? <Typography variant="body2" color="text.secondary">{params.value}</Typography>
                    : <Typography variant="caption" color="text.disabled">—</Typography>
            ),
        },
        {
            field: "received",
            headerName: "Received / Expires",
            flex: 1.2,
            sortable: false,
            renderCell: (params: GridRenderCellParams) => {
                const created = params.row.created;
                const importedISO: string | null = params.row.raw?.created ?? null;
                const ms = importedISO ? remainingMs(importedISO, now, leadExpireHours) : null;
                const expiryLabel = ms !== null ? formatRemaining(ms) : "—";
                const urgency = ms !== null ? getUrgency(ms) : "ok";
                const expiryColor = colorForUrgency(urgency);
                return (
                    <Box>
                        {created
                            ? (
                                <Typography variant="body2">{created.date} {created.time}</Typography>
                            )
                            : <Typography variant="body2">—</Typography>
                        }
                        <Typography variant="caption" sx={{ color: expiryColor, fontWeight: urgency === "expired" ? 700 : 400 }}>
                            {urgency === "expired" ? "Expired" : `Expires in ${expiryLabel}`}
                        </Typography>
                    </Box>
                );
            },
        },
        {
            field: "status_actions",
            headerName: "Status",
            width: 120,
            sortable: false,
            filterable: false,
            renderCell: (params: GridRenderCellParams) => {
                const lead: Lead = params.row.raw;
                const canVerify = can(Permission.LEADS_VERIFY);
                const canQueue = can(Permission.LEADS_QUEUE);

                return (
                    <Stack spacing={0.5} onClick={(e) => { e.stopPropagation(); }} sx={{ py: 0.5 }}>
                        <Tooltip title={
                            !canVerify
                                ? "You don't have permission to verify leads"
                                : lead.verified ? "Click to unverify" : "Click to verify"
                        }>
                            <span>
                                <Chip
                                    icon={lead.verified ? <CheckCircleIcon /> : <VerifiedIcon />}
                                    label={lead.verified ? "Verified" : "Verify"}
                                    color={lead.verified ? "success" : "warning"}
                                    variant={lead.verified ? "filled" : "outlined"}
                                    size="small"
                                    onClick={canVerify ? () => { void handleVerifyToggle(lead); } : undefined}
                                    sx={{ cursor: canVerify ? "pointer" : "default", opacity: canVerify ? 1 : 0.5 }}
                                />
                            </span>
                        </Tooltip>
                        <Tooltip title={
                            !canQueue
                                ? "You don't have permission to queue leads"
                                : lead.worker_enabled ? "Click to remove from queue" : "Click to queue for worker"
                        }>
                            <span>
                                <Chip
                                    icon={lead.worker_enabled ? <StopIcon /> : <PlayArrowIcon />}
                                    label={lead.worker_enabled ? "Queued" : "Queue"}
                                    color={lead.worker_enabled ? "success" : "default"}
                                    variant={lead.worker_enabled ? "filled" : "outlined"}
                                    size="small"
                                    onClick={canQueue ? () => { void handleQueueToggle(lead); } : undefined}
                                    sx={{ cursor: canQueue ? "pointer" : "default", opacity: canQueue ? 1 : 0.5 }}
                                />
                            </span>
                        </Tooltip>
                    </Stack>
                );
            },
        },
        {
            field: "actions",
            headerName: "",
            width: 150,
            sortable: false,
            filterable: false,
            renderCell: (params: GridRenderCellParams) => {
                const lead: Lead = params.row.raw;
                const canSend = can(Permission.LEADS_SEND);
                const canTrash = can(Permission.LEADS_TRASH);
                const canEdit = can(Permission.LEADS_EDIT);

                return (
                    <Stack direction="row" spacing={0.25} alignItems="center" onClick={(e) => { e.stopPropagation(); }}>
                        <Tooltip title={canSend ? "Send to buyers" : "You don't have permission to send leads"}>
                            <span>
                                <IconButton size="small" color="primary" disabled={!canSend} onClick={() => { handleOpenBuyerModal(lead); }}>
                                    <GroupsIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={canTrash ? "Trash lead" : "You don't have permission to trash leads"}>
                            <span>
                                <IconButton size="small" color="error" disabled={!canTrash} onClick={() => { void handleTrashLead(lead.id); }}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={canEdit ? "Edit lead" : "You don't have permission to edit leads"}>
                            <span>
                                <IconButton size="small" disabled={!canEdit} onClick={() => { navigate(`/${isAdmin ? "a" : "u"}/leads/${lead.id}`); }}>
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                );
            },
        },
    ];

    return (
        <>
            <DataGrid
                rows={rows}
                columns={columns}
                disableRowSelectionOnClick
                hideFooter
                getRowHeight={() => "auto"}
                sx={{
                    "& .MuiDataGrid-cell": { py: 1.5, alignItems: "center" },
                    "& .MuiDataGrid-columnHeaders": { backgroundColor: "action.hover" },
                }}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => { setSnackbar(p => ({ ...p, open: false })); }}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert
                    onClose={() => { setSnackbar(p => ({ ...p, open: false })); }}
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
                    onClose={() => { setBuyerModalOpen(false); setSelectedLead(null); }}
                    lead={selectedLead}
                    onRefresh={handleRefreshLead}
                />
            )}
        </>
    );
};

export default LeadsTable;
