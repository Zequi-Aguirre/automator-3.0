import { useCallback, useContext, useEffect, useState } from "react";
import jobService from "../../../services/job.service";
import workerService from "../../../services/worker.service.tsx";
import AdminJobsTable from "./adminJobsTable/AdminJobsTable.tsx";
import JobDetailDrawer from "./JobDetailDrawer.tsx";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Snackbar,
    Switch,
    TableContainer,
    TextField,
    Typography,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { Job } from "../../../types/jobTypes";
import DataContext from "../../../context/DataContext.tsx";

const INITIAL_JOB_STATE = { name: "", description: "", interval_minutes: 60, is_paused: false };

const AdminJobsSection = () => {
    const { role } = useContext(DataContext);
    const isSuperAdmin = role === 'superadmin';

    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newJob, setNewJob] = useState(INITIAL_JOB_STATE);

    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });
    const [workerLoading, setWorkerLoading] = useState(true);
    const [workerEnabled, setWorkerEnabled] = useState(false);
    const [cronSchedule, setCronSchedule] = useState("");
    const [cronDraft, setCronDraft] = useState("");

    const show = useCallback((message: string, severity: "success" | "error") => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const fetchJobs = useCallback(async () => {
        try {
            const response = await jobService.getAll();
            setJobs(response);
        } catch {
            show("Failed to fetch jobs", "error");
        } finally {
            setLoading(false);
        }
    }, [show]);

    const fetchWorkerStatus = useCallback(async () => {
        try {
            setWorkerLoading(true);
            const status = await workerService.getStatus();
            setWorkerEnabled(Boolean(status.worker_enabled));
            setCronSchedule(status.cron_schedule ?? "");
            setCronDraft(status.cron_schedule ?? "");
        } catch {
            show("Failed to fetch worker status", "error");
        } finally {
            setWorkerLoading(false);
        }
    }, [show]);

    useEffect(() => {
        fetchJobs();
        fetchWorkerStatus();
    }, [fetchJobs, fetchWorkerStatus]);

    const handleToggleWorker = useCallback(async () => {
        try {
            setWorkerLoading(true);
            if (workerEnabled) {
                await workerService.stopWorker();
                show("Worker stopped", "success");
            } else {
                await workerService.startWorker();
                show("Worker started", "success");
            }
            await fetchWorkerStatus();
        } catch {
            show("Failed to toggle worker", "error");
        } finally {
            setWorkerLoading(false);
        }
    }, [workerEnabled, fetchWorkerStatus, show]);

    const handleSaveCron = useCallback(async () => {
        if (!cronDraft.trim()) { show("Cron schedule cannot be empty", "error"); return; }
        try {
            setWorkerLoading(true);
            await workerService.updateCronSchedule(cronDraft.trim());
            show("Cron schedule updated", "success");
            await fetchWorkerStatus();
        } catch {
            show("Failed to update cron schedule", "error");
        } finally {
            setWorkerLoading(false);
        }
    }, [cronDraft, fetchWorkerStatus, show]);

    const handleCreateJob = useCallback(async () => {
        if (!newJob.name.trim()) { show("Job name is required", "error"); return; }
        if (!newJob.interval_minutes || newJob.interval_minutes < 1) { show("Valid interval is required", "error"); return; }
        try {
            const created = await jobService.createJob({ name: newJob.name, description: newJob.description, interval_minutes: newJob.interval_minutes });
            setJobs(prev => [created, ...prev]);
            setCreateModalOpen(false);
            setNewJob(INITIAL_JOB_STATE);
            show("Job created", "success");
        } catch {
            show("Failed to create job", "error");
        }
    }, [newJob, show]);

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, p: 4, height: "100%" }}>
            {/* Worker Controls */}
            <Card variant="outlined">
                <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ whiteSpace: "nowrap" }}>
                            Worker
                        </Typography>
                        {workerLoading ? (
                            <CircularProgress size={20} />
                        ) : (
                            <FormControlLabel
                                sx={{ m: 0 }}
                                control={<Switch checked={workerEnabled} onChange={handleToggleWorker} />}
                                label={workerEnabled ? "ON" : "OFF"}
                            />
                        )}
                        {isSuperAdmin && (
                            <>
                                <TextField
                                    size="small"
                                    label="Cron Schedule"
                                    value={cronDraft}
                                    onChange={(e) => setCronDraft(e.target.value)}
                                    disabled={workerEnabled || workerLoading}
                                    sx={{ flex: "1 1 280px" }}
                                    helperText={workerEnabled ? "Disable worker to edit" : "e.g. */5 * * * *"}
                                />
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={handleSaveCron}
                                    disabled={workerEnabled || workerLoading || cronDraft.trim() === cronSchedule.trim()}
                                    sx={{ whiteSpace: "nowrap" }}
                                >
                                    Save
                                </Button>
                            </>
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Jobs */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6" fontWeight={600}>Jobs</Typography>
                {isSuperAdmin && (
                    <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateModalOpen(true)}>
                        Create
                    </Button>
                )}
            </Box>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "auto" }}>
                    <AdminJobsTable jobs={jobs} setJobs={setJobs} onSelectJob={setSelectedJobId} />
                </TableContainer>
            )}

            {/* Job Detail Drawer */}
            <JobDetailDrawer
                jobId={selectedJobId}
                onClose={() => setSelectedJobId(null)}
                onJobUpdated={(updated) => setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))}
                onJobDeleted={(id) => setJobs(prev => prev.filter(j => j.id !== id))}
            />

            {/* Create Job Dialog */}
            <Dialog open={createModalOpen} onClose={() => { setCreateModalOpen(false); setNewJob(INITIAL_JOB_STATE); }} maxWidth="sm" fullWidth>
                <DialogTitle>Create Job</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                        <TextField fullWidth label="Job Name" value={newJob.name} onChange={(e) => setNewJob(p => ({ ...p, name: e.target.value }))} required size="small" />
                        <TextField fullWidth label="Description" value={newJob.description} onChange={(e) => setNewJob(p => ({ ...p, description: e.target.value }))} multiline rows={2} size="small" />
                        <TextField fullWidth label="Interval (minutes)" type="number" value={newJob.interval_minutes} onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 1) setNewJob(p => ({ ...p, interval_minutes: v })); }} required inputProps={{ min: 1 }} size="small" />
                        <FormControlLabel
                            control={<Switch checked={!newJob.is_paused} onChange={(e) => setNewJob(p => ({ ...p, is_paused: !e.target.checked }))} />}
                            label="Start immediately"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setCreateModalOpen(false); setNewJob(INITIAL_JOB_STATE); }}>Cancel</Button>
                    <Button onClick={handleCreateJob} variant="contained" disabled={!newJob.name.trim()}>Create</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(p => ({ ...p, open: false }))}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default AdminJobsSection;
