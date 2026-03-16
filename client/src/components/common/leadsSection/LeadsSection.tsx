import { useEffect, useState, useContext, useCallback } from "react";
import LeadsService from "../../../services/lead.service";
import LeadsTable from "./leadsTable/LeadsTable.tsx";
import CustomPagination from "../../Pagination";
import {
    Box,
    Typography,
    CircularProgress,
    Container,
    Button,
    Snackbar,
    Alert,
    TextField,
    ToggleButtonGroup,
    ToggleButton,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Stack,
    Badge
} from "@mui/material";
import { Lead } from "../../../types/leadTypes.ts";
import { Buyer } from "../../../types/buyerTypes.ts";
import { Source } from "../../../types/sourceTypes.ts";
import { Campaign } from "../../../types/campaignTypes.ts";
import ImportLeadsDialog from "./importLeadsDialog/importLeadsDialog.tsx";
import DataContext from "../../../context/DataContext";
import { usePermissions } from "../../../hooks/usePermissions";
import { Permission } from "../../../types/userTypes";
import buyerService from "../../../services/buyer.service.tsx";
import sourceService from "../../../services/source.service.tsx";
import campaignService from "../../../services/campaign.service.tsx";

type LeadStatus = "needs_review" | "needs_call" | "new" | "verified" | "sent" | "sold" | "trash";
type SendSource = "manual" | "worker" | "auto_send";

const LeadsSection = () => {
    const { leadFilters, setLeadFilters } = useContext(DataContext);
    const { can } = usePermissions();

    // ------------------------------
    // LOCAL FILTER STATE (UI-driven)
    // ------------------------------
    const [status, setStatus] = useState<LeadStatus>(leadFilters.status as LeadStatus);
    const [search, setSearch] = useState(leadFilters.search);
    const [page, setPage] = useState(leadFilters.page);
    const [limit, setLimit] = useState(leadFilters.limit);

    // Sent tab sub-filters (local only, not persisted)
    const [buyerId, setBuyerId] = useState<string>("");
    const [sendSource, setSendSource] = useState<SendSource | "">("");
    const [sourceId, setSourceId] = useState<string>("");
    const [campaignId, setCampaignId] = useState<string>("");

    // Tab badge counts
    const [tabCounts, setTabCounts] = useState<{ new: number; verified: number; needs_review: number; needs_call: number }>({ new: 0, verified: 0, needs_review: 0, needs_call: 0 });

    // Dropdown options for sent filters
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [sources, setSources] = useState<Source[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);

    // ------------------------------
    // DATA STATES
    // ------------------------------
    const [leads, setLeads] = useState<Lead[]>([]);
    const [leadCount, setLeadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [importOpen, setImportOpen] = useState(false);

    const [snack, setSnack] = useState({
        open: false,
        message: "",
        severity: "success"
    });

    // Load dropdown data when entering sent tab
    useEffect(() => {
        if (status !== "sent") return;

        const load = async () => {
            try {
                const [buyersData, sourcesData] = await Promise.all([
                    buyerService.getAll({ page: 1, limit: 200 }),
                    sourceService.getAll({ page: 1, limit: 200 })
                ]);
                setBuyers(buyersData.items);
                setSources(sourcesData.items);
            } catch {
                // non-fatal
            }
        };
        void load();
    }, [status]);

    // Load campaigns when source changes
    useEffect(() => {
        if (status !== "sent" || !sourceId) {
            setCampaigns([]);
            setCampaignId("");
            return;
        }
        const load = async () => {
            try {
                const data = await campaignService.getBySource(sourceId);
                setCampaigns(data.campaigns);
            } catch {
                setCampaigns([]);
            }
        };
        void load();
    }, [status, sourceId]);

    // ------------------------------
    // SYNC LOCAL FILTERS -> CONTEXT FILTERS
    // Only update context if something actually changed
    // ------------------------------
    useEffect(() => {
        const f = leadFilters;

        const changed =
            f.status !== status ||
            f.search !== search ||
            f.page !== page ||
            f.limit !== limit;

        if (changed) {
            setLeadFilters({
                ...f,
                status,
                search,
                page,
                limit
            });
        }
    }, [status, search, page, limit, leadFilters, setLeadFilters]);

    useEffect(() => {
        const fallback = can(Permission.LEADS_VIEW_NEW) ? "new" : null;
        const redirect = (condition: boolean) => {
            if (condition && fallback) { setStatus(fallback); setPage(1); }
        };
        redirect(!can(Permission.LEADS_VIEW_NEW) && status === "new");
        redirect(!can(Permission.LEADS_VIEW_VERIFIED) && status === "verified");
        redirect(!can(Permission.LEADS_VIEW_NEEDS_REVIEW) && status === "needs_review");
        redirect(!can(Permission.LEADS_VIEW_NEEDS_CALL) && status === "needs_call");
        redirect(!can(Permission.LEADS_VIEW_SENT) && status === "sent");
        redirect(!can(Permission.LEADS_VIEW_SOLD) && status === "sold");
        redirect(!can(Permission.LEADS_VIEW_TRASH) && status === "trash");
    }, [can, status]);

    const fetchTabCounts = useCallback(async () => {
        try {
            const counts = await LeadsService.getTabCounts();
            setTabCounts(counts);
        } catch {
            // non-fatal
        }
    }, []);

    // ------------------------------
    // FETCH LEADS when CONTEXT FILTERS CHANGE or sent sub-filters change
    // ------------------------------
    const fetchLeads = useCallback(async () => {
        setLoading(true);

        try {
            const { status: ctxStatus, ...rest } = leadFilters;
            const allowedStatuses: LeadStatus[] = [
                ...(can(Permission.LEADS_VIEW_NEW) ? (["new"] as LeadStatus[]) : []),
                ...(can(Permission.LEADS_VIEW_VERIFIED) ? (["verified"] as LeadStatus[]) : []),
                ...(can(Permission.LEADS_VIEW_NEEDS_REVIEW) ? (["needs_review"] as LeadStatus[]) : []),
                ...(can(Permission.LEADS_VIEW_NEEDS_CALL) ? (["needs_call"] as LeadStatus[]) : []),
                ...(can(Permission.LEADS_VIEW_SENT) ? (["sent"] as LeadStatus[]) : []),
                ...(can(Permission.LEADS_VIEW_SOLD) ? (["sold"] as LeadStatus[]) : []),
                ...(can(Permission.LEADS_VIEW_TRASH) ? (["trash"] as LeadStatus[]) : []),
            ];
            const safeStatus: LeadStatus = allowedStatuses.includes(ctxStatus as LeadStatus)
                ? (ctxStatus as LeadStatus)
                : "new";

            const response = await LeadsService.getMany({
                ...rest,
                status: safeStatus,
                ...(safeStatus === "sent" && {
                    buyer_id: buyerId || undefined,
                    send_source: (sendSource || undefined) as SendSource | undefined,
                    source_id: sourceId || undefined,
                    campaign_id: campaignId || undefined
                })
            });

            setLeads(response.leads);
            setLeadCount(response.count);
        } catch (err: unknown) {
            setSnack({
                open: true,
                message: err instanceof Error ? err.message : "Failed to load leads",
                severity: "error",
            });
        } finally {
            setLoading(false);
        }
    }, [leadFilters, buyerId, sendSource, sourceId, campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchLeads();
        void fetchTabCounts();
    }, [fetchLeads, fetchTabCounts]);

    // ------------------------------
    // EVENT HANDLERS
    // ------------------------------

    const updateStatus = (newStatus: LeadStatus) => {
        setStatus(newStatus);
        setPage(1);
        // Reset sent sub-filters when switching tabs
        if (newStatus !== "sent") {
            setBuyerId("");
            setSendSource("");
            setSourceId("");
            setCampaignId("");
        }
    };

    const handleImportSuccess = (summary: { imported?: number; rejected?: number }) => {
        setPage(1);

        const imported = summary?.imported ?? 0;
        const rejected = summary?.rejected ?? 0;

        setSnack({
            open: true,
            message: `Import complete. Imported ${imported} lead${imported === 1 ? "" : "s"}${
                rejected ? `, rejected ${rejected}` : ""
            }.`,
            severity: "success"
        });
        fetchLeads();
        void fetchTabCounts();
    };

    const clearSentFilters = () => {
        setBuyerId("");
        setSendSource("");
        setSourceId("");
        setCampaignId("");
    };

    // ------------------------------
    // RENDER
    // ------------------------------
    return (
        <Container
            maxWidth={false}
            sx={{
                height: "calc(100vh - 64px)",
                display: "flex",
                flexDirection: "column",
                p: 0
            }}
        >
            <Box
                sx={{
                    p: 4,
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    overflow: "hidden"
                }}
            >
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                        Leads
                    </Typography>
                    {can(Permission.LEADS_IMPORT) && (
                        <Button variant="contained" onClick={() => { setImportOpen(true); }}>
                            Import leads
                        </Button>
                    )}
                </Box>

                {/* STAGE TABS */}
                <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                    <ToggleButtonGroup
                        value={status}
                        exclusive
                        size="small"
                        onChange={(_e, val) => { if (val !== null) updateStatus(val as LeadStatus); }}
                    >
                        {can(Permission.LEADS_VIEW_NEW) && (
                            <ToggleButton value="new" sx={{ pr: tabCounts.new > 0 ? 2.5 : undefined }}>
                                <Badge badgeContent={tabCounts.new || null} color="primary">
                                    Needs Verification
                                </Badge>
                            </ToggleButton>
                        )}

                        {can(Permission.LEADS_VIEW_VERIFIED) && (
                            <ToggleButton value="verified" sx={{ pr: tabCounts.verified > 0 ? 2.5 : undefined }}>
                                <Badge badgeContent={tabCounts.verified || null} color="primary">
                                    Verified
                                </Badge>
                            </ToggleButton>
                        )}

                        {can(Permission.LEADS_VIEW_NEEDS_REVIEW) && (
                            <ToggleButton value="needs_review" sx={{ pr: tabCounts.needs_review > 0 ? 2.5 : undefined }}>
                                <Badge badgeContent={tabCounts.needs_review || null} color="warning">
                                    Needs Review
                                </Badge>
                            </ToggleButton>
                        )}

                        {can(Permission.LEADS_VIEW_NEEDS_CALL) && (
                            <ToggleButton value="needs_call" sx={{ pr: tabCounts.needs_call > 0 ? 2.5 : undefined }}>
                                <Badge badgeContent={tabCounts.needs_call || null} color="error">
                                    Needs Call
                                </Badge>
                            </ToggleButton>
                        )}

                        {can(Permission.LEADS_VIEW_SENT) && (
                            <ToggleButton value="sent">
                                Sent
                            </ToggleButton>
                        )}

                        {can(Permission.LEADS_VIEW_SOLD) && (
                            <ToggleButton value="sold">
                                Sold
                            </ToggleButton>
                        )}

                        {can(Permission.LEADS_VIEW_TRASH) && (
                            <ToggleButton value="trash">
                                Trash
                            </ToggleButton>
                        )}
                    </ToggleButtonGroup>

                    <TextField
                        size="small"
                        label="Search county"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        sx={{ width: 200 }}
                    />
                </Box>

                {/* SENT TAB SUB-FILTERS */}
                {status === "sent" && (
                    <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: "wrap" }} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Buyer</InputLabel>
                            <Select
                                value={buyerId}
                                label="Buyer"
                                onChange={(e) => { setBuyerId(e.target.value); setPage(1); }}
                            >
                                <MenuItem value="">All buyers</MenuItem>
                                {buyers.map(b => (
                                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Dispatch method</InputLabel>
                            <Select
                                value={sendSource}
                                label="Dispatch method"
                                onChange={(e) => { setSendSource(e.target.value as SendSource | ""); setPage(1); }}
                            >
                                <MenuItem value="">All methods</MenuItem>
                                <MenuItem value="manual">Manual</MenuItem>
                                <MenuItem value="worker">Worker</MenuItem>
                                <MenuItem value="auto_send">Auto-send</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Source</InputLabel>
                            <Select
                                value={sourceId}
                                label="Source"
                                onChange={(e) => { setSourceId(e.target.value); setPage(1); }}
                            >
                                <MenuItem value="">All sources</MenuItem>
                                {sources.map(s => (
                                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {sourceId && (
                            <FormControl size="small" sx={{ minWidth: 180 }}>
                                <InputLabel>Campaign</InputLabel>
                                <Select
                                    value={campaignId}
                                    label="Campaign"
                                    onChange={(e) => { setCampaignId(e.target.value); setPage(1); }}
                                >
                                    <MenuItem value="">All campaigns</MenuItem>
                                    {campaigns.map(c => (
                                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {(buyerId || sendSource || sourceId || campaignId) && (
                            <Button size="small" onClick={clearSentFilters}>
                                Clear filters
                            </Button>
                        )}
                    </Stack>
                )}

                {/* CONTENT */}
                { loading
                    ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                        <CircularProgress />
                    </Box>
                )
                    : (
                    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                        <Box sx={{ flexGrow: 1, overflow: "auto", minHeight: 0 }}>
                            <LeadsTable leads={leads} setLeads={setLeads} currentStatus={status} />
                        </Box>

                        <Box sx={{ backgroundColor: "background.paper" }}>
                            <CustomPagination
                                page={page}
                                setPage={setPage}
                                rows={leadCount}
                                limit={limit}
                                setLimit={setLimit}
                            />
                        </Box>
                    </Box>
                )}
            </Box>

            {/* IMPORT DIALOG */}
            <ImportLeadsDialog
                open={importOpen}
                onClose={() => { setImportOpen(false); }}
                onSuccess={handleImportSuccess}
            />

            {/* SNACKBAR */}
            <Snackbar
                open={snack.open}
                autoHideDuration={5000}
                onClose={() => { setSnack((s) => ({ ...s, open: false })); }}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => { setSnack((s) => ({ ...s, open: false })); }}
                    severity={snack.severity as "success" | "info" | "warning" | "error"}
                    sx={{ width: "100%" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default LeadsSection;
