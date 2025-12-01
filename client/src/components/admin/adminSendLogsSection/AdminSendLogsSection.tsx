import { useCallback, useEffect, useState } from "react";
import {
    Box,
    Typography,
    CircularProgress,
    Container,
    Snackbar,
    Alert,
} from "@mui/material";

import AdminSendLogsTable from "./adminSendLogsTable/AdminSendLogsTable.tsx";
import CustomPagination from "../../Pagination";
import sendLogService from "../../../services/sendLog.service.tsx";
import {SendLog} from "../../../types/sendLogTypes.ts";

const AdminSendLogsSection = () => {
    const [logs, setLogs] = useState<SendLog[]>([]);
    const [count, setCount] = useState(0);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(100);

    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success" as "success" | "error",
    });

    const showNotification = useCallback((message: string, severity: "success" | "error") => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await sendLogService.getMany({ page, limit });
            console.log("Fetched send logs:", data);
            setLogs(data.logs);
            setCount(data.count);
        } catch (err: unknown) {
            showNotification("Failed to fetch send logs", "error");
        } finally {
            setLoading(false);
        }
    }, [page, limit, showNotification]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleSnackbarClose = () => {
        setSnackbar((prev) => {
            return { ...prev, open: false };
        });
    };

    return (
        <Container
            maxWidth={false}
            sx={{
                height: "calc(100vh - 64px)",
                display: "flex",
                flexDirection: "column",
                p: 0,
            }}
        >
            <Box
                sx={{
                    p: 4,
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    overflow: "hidden",
                }}
            >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                    <Typography variant="h4" component="h2" sx={{ fontWeight: "bold" }}>
                        Send Logs
                    </Typography>
                </Box>

                {loading
                ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                        <CircularProgress />
                    </Box>
                )
                : (
                    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                        <Box sx={{ flexGrow: 1, overflow: "auto", minHeight: 0 }}>
                            <AdminSendLogsTable logs={logs} setLogs={setLogs} />
                        </Box>

                        <Box sx={{ backgroundColor: "background.paper" }}>
                            <CustomPagination
                                page={page}
                                setPage={setPage}
                                rows={count}
                                limit={limit}
                                setLimit={setLimit}
                            />
                        </Box>
                    </Box>
                )}
            </Box>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminSendLogsSection;