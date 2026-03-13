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
    Stack
} from "@mui/material";
import { Lead } from "../../../types/leadTypes.ts";
import ImportLeadsDialog from "./importLeadsDialog/importLeadsDialog.tsx";
import DataContext from "../../../context/DataContext";
import { usePermissions } from "../../../hooks/usePermissions";
import { Permission } from "../../../types/userTypes";

const LeadsSection = () => {
    const { leadFilters, setLeadFilters, role } = useContext(DataContext);
    const { can } = usePermissions();

    // ------------------------------
    // LOCAL FILTER STATE (UI-driven)
    // ------------------------------
    const [status, setStatus] = useState(leadFilters.status);
    const [search, setSearch] = useState(leadFilters.search);
    const [page, setPage] = useState(leadFilters.page);
    const [limit, setLimit] = useState(leadFilters.limit);
    const isAdmin = role.includes('admin')

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
        if (!isAdmin && (status === "sent" || status === "trash")) {
            setStatus("new");
            setPage(1);
        }
    }, [isAdmin, status]);

    // ------------------------------
    // FETCH LEADS when CONTEXT FILTERS CHANGE
    // ------------------------------
    const fetchLeads = useCallback(async () => {
        setLoading(true);

        try {
            const { status, ...rest } = leadFilters;
            const verifiedStatus = isAdmin ? status : (status === "new" || status === "verified" ? status : "new");
            const response = await LeadsService.getMany({
                ...rest,
                status: verifiedStatus
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
    }, [leadFilters, isAdmin]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // ------------------------------
    // EVENT HANDLERS
    // ------------------------------

    const updateStatus = (newStatus: string) => {
        setStatus(newStatus as "new" | "verified" | "sent" | "sold" | "trash");
        setPage(1);
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
    };

    const currentVariant = (cond: boolean): "contained" | "outlined" =>
        cond ? "contained" : "outlined";

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

                {/* FILTERS */}
                <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: "center" }}>
                    <Button
                        variant={currentVariant(status === "new")}
                        onClick={() => { updateStatus("new"); }}
                    >
                        New
                    </Button>

                    <Button
                        variant={currentVariant(status === "verified")}
                        onClick={() => { updateStatus("verified"); }}
                    >
                        Verified
                    </Button>

                    { isAdmin && (
                            <>
                                <Button
                                    variant={currentVariant(status === "sent")}
                                    onClick={() => { updateStatus("sent"); }}
                                >
                                    Sent
                                </Button>

                                <Button
                                    variant={currentVariant(status === "sold")}
                                    onClick={() => { updateStatus("sold"); }}
                                >
                                    Sold
                                </Button>

                                <Button
                                    variant={currentVariant(status === "trash")}
                                    onClick={() => { updateStatus("trash"); }}
                                >
                                    Trash
                                </Button>
                            </>
                    )}

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
                </Stack>

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
                            <LeadsTable leads={leads} setLeads={setLeads} />
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