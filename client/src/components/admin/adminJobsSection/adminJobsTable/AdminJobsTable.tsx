import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Button, Snackbar, Alert, Typography } from "@mui/material";
import { Job } from "../../../../types/jobTypes";
import { Link } from "react-router-dom";
import jobService from "../../../../services/job.service";
import { useState } from "react";
import AdminJobsTableActions from "./adminJobsTableActions/adminJobsTableActions.tsx";

interface JobsTableProps {
    jobs: Job[];
    setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
}

const AdminJobsTable = ({ jobs, setJobs }: JobsTableProps) => {
    const [loadingJobs, setLoadingJobs] = useState<Record<string, boolean>>({});
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

    const handleRunNow = async (jobId: string) => {
        setLoadingJobs(prev => ({ ...prev, [jobId]: true }));
        try {
            const updatedJob = await jobService.runJob(jobId);
            setJobs((prevJobs) =>
                prevJobs.map((job) =>
                    job.id === jobId ? updatedJob : job
                )
            );
            showNotification('Job started successfully', 'success');
        } catch (error) {
            showNotification('Failed to start job', 'error');
            console.error("Error running job:", error);
        } finally {
            setLoadingJobs(prev => ({ ...prev, [jobId]: false }));
        }
    };

    const handleTogglePause = async (jobId: string, isPaused: boolean) => {
        setLoadingJobs(prev => ({ ...prev, [jobId]: true }));

        try {
            const updatedJob = isPaused
                ? await jobService.resumeJob(jobId)
                : await jobService.pauseJob(jobId);

            setJobs((prevJobs) =>
                prevJobs.map((job) =>
                    job.id === jobId ? updatedJob : job
                )
            );
            showNotification(`Job ${isPaused ? 'resumed' : 'paused'} successfully`, 'success');
        } catch (error) {
            showNotification(`Failed to ${isPaused ? 'resume' : 'pause'} job`, 'error');
            console.error("Error updating job status:", error);
        } finally {
            setLoadingJobs(prev => ({ ...prev, [jobId]: false }));
        }
    };

    const handleDeleteJob = async (jobId: string) => {
        setLoadingJobs(prev => ({ ...prev, [jobId]: true }));

        try {
            await jobService.deleteJob(jobId);
            setJobs((prevJobs) => prevJobs.filter((job) => job.id !== jobId));
            showNotification('Job deleted successfully', 'success');
        } catch (error) {
            showNotification('Failed to delete job', 'error');
            console.error("Error deleting job:", error);
        } finally {
            setLoadingJobs(prev => ({ ...prev, [jobId]: false }));
        }
    };

    const formatDate = (date: Date | null) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleString();
    };

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Name',
            flex: 1,
            sortable: true,
            renderCell: (params) => (
                <Typography>
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'description',
            headerName: 'Description',
            flex: 1.5,
            sortable: true
        },
        {
            field: 'interval_minutes',
            headerName: 'Interval (min)',
            flex: 0.7,
            sortable: true
        },
        {
            field: 'last_run',
            headerName: 'Last Run',
            flex: 1,
            sortable: true,
            renderCell: (params) => formatDate(params.value)
        },
        {
            field: 'is_paused',
            headerName: 'Status',
            flex: 0.7,
            sortable: true,
            renderCell: (params) => (
                <Typography
                    color={params.value ? 'warning.main' : 'success.main'}
                    fontWeight="medium"
                >
                    {params.value ? 'Paused' : 'Active'}
                </Typography>
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <AdminJobsTableActions
                    params={params}
                    loadingJobs={loadingJobs}
                    handleRunNow={handleRunNow}
                    handleTogglePause={handleTogglePause}
                    handleDeleteJob={handleDeleteJob}
                />
            )
        },
        {
            field: 'details',
            headerName: 'Details',
            flex: 0.7,
            sortable: false,
            renderCell: (params) => (
                <Button
                    component={Link}
                    to={`/worker-jobs/${params.row.id}`}
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
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
                rows={jobs}
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

export default AdminJobsTable;