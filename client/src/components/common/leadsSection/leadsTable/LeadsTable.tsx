import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
} from "@mui/material";
import {
    CheckCircle as CheckCircleIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Groups as GroupsIcon,
    Phone as PhoneIcon,
    PhoneCallback as PhoneCallbackIcon,
    PlayArrow as PlayArrowIcon,
    Stop as StopIcon,
    VerifiedUser as VerifiedIcon,
} from "@mui/icons-material";
import { Lead } from "../../../../types/leadTypes.ts";
import { useNavigate } from "react-router-dom";
import leadsService from "../../../../services/lead.service.tsx";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import {
    remainingMs,
    formatRemaining,
    getUrgency,
    colorForUrgency,
} from "../../../../utils/leadExpiry";
import { parseUtcToZone } from "../../../../utils/dates.ts";
import workingsService from "../../../../services/settings.service.tsx";
import BuyerSendModal from "../../leadDetails/buyerSendModal/BuyerSendModal.tsx";
import { usePermissions } from "../../../../hooks/usePermissions.ts";
import { Permission } from "../../../../types/userTypes.ts";
import trashReasonService, { TrashReason } from "../../../../services/trashReason.service.tsx";
import callRequestReasonService, { CallRequestReason } from "../../../../services/callRequestReason.service.tsx";
import callOutcomeService, { CallOutcome } from "../../../../services/callOutcome.service.tsx";

interface LeadsTableProps {
    leads: Lead[];
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
    currentStatus?: string;
}

const LeadsTable = ({ leads, setLeads, currentStatus }: LeadsTableProps) => {
    const navigate = useNavigate();
    const { can } = usePermissions();
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success" as "success" | "error",
    });
    const [buyerModalOpen, setBuyerModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [trashDialogOpen, setTrashDialogOpen] = useState(false);
    const [trashTargetId, setTrashTargetId] = useState<string | null>(null);
    const [trashReasons, setTrashReasons] = useState<TrashReason[]>([]);
    const [selectedTrashReason, setSelectedTrashReason] = useState<TrashReason | null>(null);
    const [now, setNow] = useState(DateTime.utc());
    const [leadExpireHours, setLeadExpireHours] = useState(18);

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
                navigate(`/leads/${lead.id}`);
            }
        } catch {
            showNotification("Failed to update verification", "error");
        }
    };

    const handleQueueToggle = async (lead: Lead) => {
        try {
            if (lead.queued) {
                const updated = await leadsService.unqueueLead(lead.id);
                setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
                showNotification("Lead removed from worker", "success");
            } else {
                const updated = await leadsService.queueLead(lead.id);
                setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
                showNotification("Lead sent to worker", "success");
            }
        } catch {
            showNotification("Failed to update queue", "error");
        }
    };

    const handleOpenTrashDialog = async (leadId: string) => {
        setTrashTargetId(leadId);
        setSelectedTrashReason(null);
        setTrashDialogOpen(true);
        try {
            const reasons = await trashReasonService.getActive();
            setTrashReasons(reasons);
        } catch {
            setTrashReasons([]);
        }
    };

    const handleTrashLead = async () => {
        if (!trashTargetId) return;
        try {
            const deleted = await leadsService.trashLead(trashTargetId, selectedTrashReason?.label);
            setLeads(prev => prev.filter(l => l.id !== deleted.id));
            showNotification("Lead moved to trash", "success");
        } catch {
            showNotification("Failed to trash lead", "error");
        } finally {
            setTrashDialogOpen(false);
            setTrashTargetId(null);
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

    const [callDialogOpen, setCallDialogOpen] = useState(false);
    const [callDialogMode, setCallDialogMode] = useState<"request" | "execute">("request");
    const [callTargetLead, setCallTargetLead] = useState<Lead | null>(null);
    const [callReason, setCallReason] = useState("");
    const [callRequestNote, setCallRequestNote] = useState("");
    const [callOutcomes, setCallOutcomes] = useState<CallOutcome[]>([]);
    const [selectedCallOutcome, setSelectedCallOutcome] = useState<CallOutcome | null>(null);
    const [callNotes, setCallNotes] = useState("");
    const [callRequestReasons, setCallRequestReasons] = useState<CallRequestReason[]>([]);

    const selectedReason = callRequestReasons.find(r => r.label === callReason) ?? null;

    const openRequestCallDialog = async (lead: Lead) => {
        setCallTargetLead(lead);
        setCallReason("");
        setCallRequestNote("");
        setCallDialogMode("request");
        setCallDialogOpen(true);
        try {
            const reasons = await callRequestReasonService.getActive();
            setCallRequestReasons(reasons);
        } catch {
            setCallRequestReasons([]);
        }
    };

    const openExecuteCallDialog = async (lead: Lead) => {
        setCallTargetLead(lead);
        setCallNotes("");
        setCallDialogMode("execute");
        setCallDialogOpen(true);
        try {
            const outcomes = await callOutcomeService.getActive();
            setCallOutcomes(outcomes);
            setSelectedCallOutcome(outcomes[0] ?? null);
        } catch {
            setCallOutcomes([]);
            setSelectedCallOutcome(null);
        }
    };

    const handleSubmitCallDialog = async () => {
        if (!callTargetLead) return;
        try {
            if (callDialogMode === "request") {
                const updated = await leadsService.requestCall(callTargetLead.id, callReason, callRequestNote || undefined);
                setLeads(prev => prev.filter(l => l.id !== updated.id));
                showNotification("Lead flagged for call", "success");
            } else {
                if (!selectedCallOutcome) return;
                const updated = await leadsService.executeCall(callTargetLead.id, selectedCallOutcome.id, callNotes || undefined);
                if (!updated.needs_call) {
                    // Resolved — remove from needs_call list
                    setLeads(prev => prev.filter(l => l.id !== updated.id));
                } else {
                    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
                }
                showNotification("Call logged", "success");
            }
        } catch {
            showNotification("Failed to update call", "error");
        } finally {
            setCallDialogOpen(false);
            setCallTargetLead(null);
        }
    };

    const handleUntrashLead = async (leadId: string) => {
        try {
            const restored = await leadsService.untrashLead(leadId);
            setLeads(prev => prev.filter(l => l.id !== restored.id));
            showNotification("Lead restored", "success");
        } catch {
            showNotification("Failed to restore lead", "error");
        }
    };

    const handleResolveNeedsReview = async (lead: Lead) => {
        try {
            const updated = await leadsService.resolveNeedsReview(lead.id);
            setLeads(prev => prev.filter(l => l.id !== updated.id));
            showNotification("Lead moved to Needs Verification", "success");
        } catch {
            showNotification("Failed to resolve review flag", "error");
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
                    onClick={() => { navigate(`/leads/${params.row.id}`); }}
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
                                ? "You don't have permission to send via worker"
                                : lead.queued ? "Remove from Worker" : "Send via Worker"
                        }>
                            <span>
                                <Chip
                                    icon={lead.queued ? <StopIcon /> : <PlayArrowIcon />}
                                    label={lead.queued ? "In Worker" : "Worker"}
                                    color={lead.queued ? "success" : "default"}
                                    variant={lead.queued ? "filled" : "outlined"}
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
        ...(currentStatus === "needs_review"
            ? [{
            field: "needs_review_reason",
            headerName: "Missing Fields",
            flex: 1.2,
            sortable: false,
            renderCell: (params: GridRenderCellParams) => {
                const lead: Lead = params.row.raw;
                const canEdit = can(Permission.LEADS_EDIT);
                const reason = lead.needs_review_reason ?? "Missing fields";
                return (
                    <Stack spacing={0.5} onClick={(e) => { e.stopPropagation(); }}>
                        <Tooltip title={reason}>
                            <Typography
                                variant="caption"
                                color="warning.main"
                                sx={{
                                    display: "block",
                                    maxWidth: 160,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    fontWeight: 500,
                                }}
                            >
                                {reason}
                            </Typography>
                        </Tooltip>
                        <Tooltip title={canEdit ? "Mark as resolved (info filled in)" : "You don't have permission to edit leads"}>
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    disabled={!canEdit}
                                    onClick={() => { void handleResolveNeedsReview(lead); }}
                                >
                                    Resolve
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>
                );
            },
        }] as GridColDef[]
            : []),
        ...(currentStatus === "needs_call"
            ? [{
            field: "call_info",
            headerName: "Call Info",
            flex: 1.5,
            sortable: false,
            renderCell: (params: GridRenderCellParams) => {
                const lead: Lead = params.row.raw;
                const canExecute = can(Permission.LEADS_CALL_EXECUTE);
                const lastCallAt = lead.call_executed_at
                    ? parseUtcToZone(lead.call_executed_at)
                    : null;
                return (
                    <Stack spacing={0.5} onClick={(e) => { e.stopPropagation(); }}>
                        {lead.call_reason && (
                            <Tooltip title={lead.call_request_note ?? ""} disableHoverListener={!lead.call_request_note}>
                                <Typography variant="caption" color="text.secondary" sx={{ cursor: lead.call_request_note ? "help" : "default" }}>
                                    <strong>Reason:</strong> {lead.call_reason}
                                </Typography>
                            </Tooltip>
                        )}
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                                label={`${lead.call_attempts ?? 0} attempt${(lead.call_attempts ?? 0) === 1 ? "" : "s"}`}
                                size="small"
                                variant="outlined"
                            />
                            {lead.call_outcome && (
                                <Chip
                                    label={lead.call_outcome.replace("_", " ")}
                                    size="small"
                                    color={lead.call_outcome === "resolved" ? "success" : "default"}
                                    variant="outlined"
                                />
                            )}
                        </Stack>
                        {lastCallAt && (
                            <Typography variant="caption" color="text.disabled">
                                Last: {lastCallAt.date} {lastCallAt.time}
                            </Typography>
                        )}
                        <Tooltip title={canExecute ? "Log a call attempt" : "You don't have permission to log calls"}>
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<PhoneIcon />}
                                    disabled={!canExecute}
                                    onClick={() => { void openExecuteCallDialog(lead); }}
                                >
                                    Log Call
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>
                );
            },
        }] as GridColDef[]
            : []),
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
                const canRequestCall = can(Permission.LEADS_CALL_REQUEST);

                if (currentStatus === "trash") {
                    return (
                        <Stack direction="row" spacing={0.25} alignItems="center" onClick={(e) => { e.stopPropagation(); }}>
                            <Tooltip title={canTrash ? "Restore lead" : "You don't have permission to restore leads"}>
                                <span>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="success"
                                        disabled={!canTrash}
                                        onClick={() => { void handleUntrashLead(lead.id); }}
                                    >
                                        Untrash
                                    </Button>
                                </span>
                            </Tooltip>
                        </Stack>
                    );
                }

                return (
                    <Stack direction="row" spacing={0.25} alignItems="center" onClick={(e) => { e.stopPropagation(); }}>
                        <Tooltip title={canSend ? "Send to buyers" : "You don't have permission to send leads"}>
                            <span>
                                <IconButton size="small" color="primary" disabled={!canSend} onClick={() => { handleOpenBuyerModal(lead); }}>
                                    <GroupsIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        {currentStatus !== "needs_call" && (
                            <Tooltip title={canRequestCall ? "Request a call for this lead" : "You don't have permission to request calls"}>
                                <span>
                                    <IconButton size="small" color="warning" disabled={!canRequestCall} onClick={() => { void openRequestCallDialog(lead); }}>
                                        <PhoneCallbackIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                        <Tooltip title={canTrash ? "Trash lead" : "You don't have permission to trash leads"}>
                            <span>
                                <IconButton size="small" color="error" disabled={!canTrash} onClick={() => { void handleOpenTrashDialog(lead.id); }}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={canEdit ? "Edit lead" : "You don't have permission to edit leads"}>
                            <span>
                                <IconButton size="small" disabled={!canEdit} onClick={() => { navigate(`/leads/${lead.id}`); }}>
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

            <Dialog open={trashDialogOpen} onClose={() => { setTrashDialogOpen(false); }} maxWidth="xs" fullWidth>
                <DialogTitle>Move to Trash?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Are you sure you want to move this lead to trash? You can restore it later.
                    </DialogContentText>
                    <Autocomplete
                        options={trashReasons}
                        getOptionLabel={(o) => o.label}
                        value={selectedTrashReason}
                        onChange={(_, val) => { setSelectedTrashReason(val); }}
                        renderInput={(params) => (
                            <TextField {...params} label="Reason (optional)" size="small" fullWidth />
                        )}
                        size="small"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setTrashDialogOpen(false); }}>Cancel</Button>
                    <Button onClick={() => { void handleTrashLead(); }} color="error" variant="contained">Move to Trash</Button>
                </DialogActions>
            </Dialog>

            {/* REQUEST CALL DIALOG */}
            <Dialog
                open={callDialogOpen && callDialogMode === "request"}
                onClose={() => { setCallDialogOpen(false); }}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Request a Call</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Select a reason why this lead needs a call. It will be moved to the "Needs Call" tab.
                    </DialogContentText>
                    <Stack spacing={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Reason</InputLabel>
                            <Select
                                label="Reason"
                                value={callReason}
                                onChange={(e) => { setCallReason(e.target.value); setCallRequestNote(""); }}
                            >
                                {callRequestReasons.map(r => (
                                    <MenuItem key={r.id} value={r.label}>{r.label}</MenuItem>
                                ))}
                                {callRequestReasons.length === 0 && (
                                    <MenuItem disabled value="">No reasons configured</MenuItem>
                                )}
                            </Select>
                        </FormControl>
                        {selectedReason && (
                            <TextField
                                label={selectedReason.comment_required ? 'Comment (required)' : 'Comment (optional)'}
                                multiline
                                rows={3}
                                fullWidth
                                size="small"
                                value={callRequestNote}
                                onChange={(e) => { setCallRequestNote(e.target.value); }}
                                required={selectedReason.comment_required}
                            />
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setCallDialogOpen(false); }}>Cancel</Button>
                    <Button
                        onClick={() => { void handleSubmitCallDialog(); }}
                        color="warning"
                        variant="contained"
                        disabled={!callReason || (!!selectedReason?.comment_required && !callRequestNote.trim())}
                    >
                        Request Call
                    </Button>
                </DialogActions>
            </Dialog>

            {/* EXECUTE CALL DIALOG */}
            <Dialog
                open={callDialogOpen && callDialogMode === "execute"}
                onClose={() => { setCallDialogOpen(false); }}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Log Call Attempt</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 0.5 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Outcome</InputLabel>
                            <Select
                                value={selectedCallOutcome?.id ?? ""}
                                label="Outcome"
                                onChange={(e) => {
                                    const found = callOutcomes.find(o => o.id === e.target.value) ?? null;
                                    setSelectedCallOutcome(found);
                                }}
                            >
                                {callOutcomes.map(o => (
                                    <MenuItem key={o.id} value={o.id}>
                                        {o.label}{o.resolves_call ? " (closes ticket)" : ""}
                                    </MenuItem>
                                ))}
                                {callOutcomes.length === 0 && (
                                    <MenuItem disabled value="">No outcomes configured</MenuItem>
                                )}
                            </Select>
                        </FormControl>
                        <TextField
                            label={selectedCallOutcome?.comment_required ? "Notes (required)" : "Notes (optional)"}
                            multiline
                            rows={3}
                            fullWidth
                            value={callNotes}
                            onChange={(e) => { setCallNotes(e.target.value); }}
                            size="small"
                            required={selectedCallOutcome?.comment_required}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setCallDialogOpen(false); }}>Cancel</Button>
                    <Button
                        onClick={() => { void handleSubmitCallDialog(); }}
                        color="primary"
                        variant="contained"
                        disabled={!selectedCallOutcome || (!!selectedCallOutcome.comment_required && !callNotes.trim())}
                    >
                        Log Call
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default LeadsTable;
