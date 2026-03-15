import { useCallback, useContext, useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    Drawer,
    FormControlLabel,
    IconButton,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import { Cancel, Close, Edit, Pause, PlayArrow, Save } from '@mui/icons-material';
import { Job } from '../../../types/jobTypes';
import jobService from '../../../services/job.service';
import DataContext from '../../../context/DataContext';
import ConfirmationDialog from '../../common/confirmationDialog';

interface Props {
    jobId: string | null;
    onClose: () => void;
    onJobUpdated: (job: Job) => void;
    onJobDeleted: (jobId: string) => void;
}

interface DialogConfig {
    open: boolean;
    title: string;
    message: string;
    confirmButtonText: string;
    confirmButtonColor?: 'error' | 'warning' | 'primary' | 'success';
    onConfirm: () => void;
}

const JobDetailDrawer = ({ jobId, onClose, onJobUpdated, onJobDeleted }: Props) => {
    const { role } = useContext(DataContext);
    const isSuperAdmin = role === 'superadmin';

    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editedJob, setEditedJob] = useState({ name: '', description: '', interval_minutes: 60, is_paused: false });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [dialog, setDialog] = useState<DialogConfig>({
        open: false, title: '', message: '', confirmButtonText: '', onConfirm: () => {},
    });

    const fetchJob = useCallback(async () => {
        if (!jobId) return;
        setLoading(true);
        try {
            const data = await jobService.getJobById(jobId);
            setJob(data);
            setEditedJob({ name: data.name ?? '', description: data.description ?? '', interval_minutes: data.interval_minutes, is_paused: data.is_paused });
        } finally {
            setLoading(false);
        }
    }, [jobId]);

    useEffect(() => {
        if (jobId) {
            setEditMode(false);
            fetchJob();
        } else {
            setJob(null);
        }
    }, [jobId, fetchJob]);

    const show = (message: string, severity: 'success' | 'error') => setSnackbar({ open: true, message, severity });

    const handleSave = async () => {
        if (!jobId || !job) return;
        try {
            const updated = await jobService.updateJob(jobId, editedJob);
            setJob(updated);
            setEditMode(false);
            onJobUpdated(updated);
            show('Job updated', 'success');
        } catch {
            show('Failed to update job', 'error');
        }
    };

    const handleTogglePause = () => {
        if (!job || !jobId) return;
        if (!job.is_paused) {
            setDialog({
                open: true,
                title: 'Hold Job',
                message: 'This will hold the job indefinitely until a user resumes it.',
                confirmButtonText: 'Hold',
                confirmButtonColor: 'error',
                onConfirm: async () => {
                    try {
                        const updated = await jobService.pauseJob(jobId);
                        setJob(updated);
                        onJobUpdated(updated);
                        show('Job paused', 'success');
                    } catch {
                        show('Failed to pause job', 'error');
                    }
                },
            });
        } else {
            jobService.resumeJob(jobId).then((updated) => {
                setJob(updated);
                onJobUpdated(updated);
                show('Job resumed', 'success');
            }).catch(() => show('Failed to resume job', 'error'));
        }
    };

    const handleDelete = () => {
        if (!jobId) return;
        setDialog({
            open: true,
            title: 'Delete Job',
            message: 'Are you sure you want to delete this job? This cannot be undone.',
            confirmButtonText: 'Delete',
            confirmButtonColor: 'error',
            onConfirm: async () => {
                try {
                    await jobService.deleteJob(jobId);
                    onJobDeleted(jobId);
                    onClose();
                    show('Job deleted', 'success');
                } catch {
                    show('Failed to delete job', 'error');
                }
            },
        });
    };

    const formatDate = (d: string | Date | null) => d ? new Date(d).toLocaleString() : 'Never';

    return (
        <>
            <Drawer
                anchor="right"
                open={!!jobId}
                onClose={onClose}
                PaperProps={{ sx: { width: 420 } }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
                    <Typography variant="h6" fontWeight={600}>Job Details</Typography>
                    <IconButton onClick={onClose} size="small"><Close /></IconButton>
                </Box>
                <Divider />

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                        <CircularProgress />
                    </Box>
                ) : !job ? null : (
                    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, overflow: 'auto' }}>
                        {/* Actions */}
                        {!editMode ? (
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color={job.is_paused ? 'success' : 'error'}
                                    startIcon={job.is_paused ? <PlayArrow /> : <Pause />}
                                    onClick={handleTogglePause}
                                >
                                    {job.is_paused ? 'Resume' : 'Hold'}
                                </Button>
                                {isSuperAdmin && (
                                    <Button size="small" variant="outlined" color="error" onClick={handleDelete}>
                                        Delete
                                    </Button>
                                )}
                                <Button size="small" variant="contained" startIcon={<Edit />} onClick={() => setEditMode(true)}>
                                    Edit
                                </Button>
                            </Stack>
                        ) : (
                            <Stack direction="row" spacing={1}>
                                <Button size="small" variant="contained" startIcon={<Save />} onClick={handleSave}>Save</Button>
                                <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={() => setEditMode(false)}>Cancel</Button>
                            </Stack>
                        )}

                        <TextField
                            label="Job Name"
                            value={editMode ? editedJob.name : (job.name ?? '')}
                            onChange={(e) => setEditedJob(p => ({ ...p, name: e.target.value }))}
                            disabled={!editMode || !isSuperAdmin}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label="Description"
                            value={editMode ? editedJob.description : (job.description ?? '')}
                            onChange={(e) => setEditedJob(p => ({ ...p, description: e.target.value }))}
                            disabled={!editMode || !isSuperAdmin}
                            size="small"
                            fullWidth
                            multiline
                            rows={2}
                        />
                        <TextField
                            label="Interval (minutes)"
                            type="number"
                            value={editMode ? editedJob.interval_minutes : job.interval_minutes}
                            onChange={(e) => {
                                const v = parseInt(e.target.value);
                                if (!isNaN(v) && v >= 1) setEditedJob(p => ({ ...p, interval_minutes: v }));
                            }}
                            disabled={!editMode}
                            size="small"
                            fullWidth
                            inputProps={{ min: 1 }}
                        />
                        {editMode && (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={!editedJob.is_paused}
                                        onChange={(e) => setEditedJob(p => ({ ...p, is_paused: !e.target.checked }))}
                                    />
                                }
                                label="Active"
                            />
                        )}

                        <Divider />

                        <Stack spacing={1.5}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Status</Typography>
                                <Typography variant="body2">{job.is_paused ? 'Paused' : 'Active'}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Last Run</Typography>
                                <Typography variant="body2">{formatDate(job.last_run)}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Created</Typography>
                                <Typography variant="body2">{formatDate(job.created)}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Last Modified</Typography>
                                <Typography variant="body2">{formatDate(job.updated)}</Typography>
                            </Box>
                        </Stack>
                    </Box>
                )}
            </Drawer>

            <ConfirmationDialog
                open={dialog.open}
                onClose={() => setDialog(p => ({ ...p, open: false }))}
                onConfirm={dialog.onConfirm}
                title={dialog.title}
                message={dialog.message}
                confirmButtonText={dialog.confirmButtonText}
                confirmButtonColor={dialog.confirmButtonColor}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
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

export default JobDetailDrawer;
