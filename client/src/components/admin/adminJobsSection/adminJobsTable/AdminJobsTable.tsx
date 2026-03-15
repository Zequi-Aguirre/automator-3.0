import { useState } from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    IconButton,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { Pause, PlayArrow, Refresh } from '@mui/icons-material';
import { Job } from '../../../../types/jobTypes';
import jobService from '../../../../services/job.service';

interface Props {
    jobs: Job[];
    setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
    onSelectJob: (jobId: string) => void;
}

const AdminJobsTable = ({ jobs, setJobs, onSelectJob }: Props) => {
    const [loadingJobs, setLoadingJobs] = useState<Record<string, boolean>>({});
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const show = (message: string, severity: 'success' | 'error') => setSnackbar({ open: true, message, severity });

    const withLoading = async (jobId: string, fn: () => Promise<Job | void>) => {
        setLoadingJobs(p => ({ ...p, [jobId]: true }));
        try { await fn(); } finally { setLoadingJobs(p => ({ ...p, [jobId]: false })); }
    };

    const handleRunNow = (jobId: string) => withLoading(jobId, async () => {
        const updated = await jobService.runJob(jobId);
        setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
        show('Job triggered', 'success');
    }).catch(() => show('Failed to run job', 'error'));

    const handleTogglePause = (jobId: string, isPaused: boolean) => withLoading(jobId, async () => {
        const updated = isPaused ? await jobService.resumeJob(jobId) : await jobService.pauseJob(jobId);
        setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
        show(`Job ${isPaused ? 'resumed' : 'paused'}`, 'success');
    }).catch(() => show('Failed to update job', 'error'));

    const formatDate = (d: Date | string | null) => d ? new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';

    return (
        <>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'action.hover' }}>Job</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'action.hover', width: 90 }}>Every</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'action.hover', width: 160 }}>Last Run</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'action.hover', width: 90 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600, bgcolor: 'action.hover', width: 90 }} align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {jobs.map((job) => {
                        const busy = loadingJobs[job.id];
                        return (
                            <TableRow
                                key={job.id}
                                hover
                                onClick={() => onSelectJob(job.id)}
                                sx={{ cursor: 'pointer' }}
                            >
                                <TableCell>
                                    <Typography variant="body2" fontWeight={500}>{job.name}</Typography>
                                    {job.description && (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                            {job.description}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">{job.interval_minutes}m</Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">{formatDate(job.last_run)}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={job.is_paused ? 'Paused' : 'Active'}
                                        size="small"
                                        color={job.is_paused ? 'warning' : 'success'}
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                        {busy ? (
                                            <CircularProgress size={18} sx={{ mx: 1 }} />
                                        ) : (
                                            <>
                                                <Tooltip title="Run now">
                                                    <IconButton size="small" onClick={() => handleRunNow(job.id)}>
                                                        <Refresh fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={job.is_paused ? 'Resume' : 'Hold'}>
                                                    <IconButton
                                                        size="small"
                                                        color={job.is_paused ? 'success' : 'default'}
                                                        onClick={() => handleTogglePause(job.id, job.is_paused)}
                                                    >
                                                        {job.is_paused ? <PlayArrow fontSize="small" /> : <Pause fontSize="small" />}
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {jobs.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                <Typography variant="body2" color="text.disabled">No jobs configured</Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default AdminJobsTable;
