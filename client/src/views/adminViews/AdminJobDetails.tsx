import {useCallback, useContext, useEffect, useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    Container,
    Divider,
    IconButton,
    Stack,
    TextField,
    Typography,
    Alert,
    Snackbar,
    Switch,
    FormControlLabel
} from '@mui/material';
import {ArrowBack, Edit, Save, Cancel, PlayArrow, Pause} from '@mui/icons-material';
import {Job} from '../../types/jobTypes';
import jobService from '../../services/job.service';
import DataContext from "../../context/DataContext.tsx";
import ConfirmationDialog from '../../components/common/confirmationDialog.tsx';

interface DialogConfig {
    open: boolean;
    title: string;
    message: string;
    confirmButtonText: string;
    confirmButtonColor?: 'error' | 'warning' | 'primary' | 'success';
    onConfirm: () => void;
}

const AdminJobDetails = () => {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [job, setJob] = useState<Job | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { role } = useContext(DataContext);
    const [editedJob, setEditedJob] = useState({
        name: '',
        description: '',
        interval_minutes: 60,
        is_paused: false
    });
    const [dialogConfig, setDialogConfig] = useState<DialogConfig>({
        open: false,
        title: '',
        message: '',
        confirmButtonText: '',
        confirmButtonColor: 'error',
        onConfirm: () => {
        }
    });
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const fetchJob = useCallback(async () => {
        try {
            if (!id) return;
            setLoading(true);
            const response = await jobService.getJobById(id);
            setJob(response);
            setEditedJob({
                name: response.name ?? '',
                description: response.description ?? '',
                interval_minutes: response.interval_minutes,
                is_paused: response.is_paused
            });
        } catch (err) {
            setError('Failed to load job details');
            console.error('Error fetching job:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchJob();
    }, [fetchJob]);

    const showNotification = (message: string, severity: 'success' | 'error') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    const handleEditClick = () => {
        setEditMode(true);
    };

    const handleCancelEdit = () => {
        if (!job) return;
        setEditMode(false);
        setEditedJob({
            name: job.name ?? '',
            description: job.description ?? '',
            interval_minutes: job.interval_minutes,
            is_paused: job.is_paused
        });
    };

    const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target;

        if (name === 'interval_minutes') {
            const numValue = parseInt(value);
            if (isNaN(numValue) || numValue < 1) return;
            setEditedJob(prev => ({
                ...prev,
                [name]: numValue
            }));
            return;
        }

        setEditedJob(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, checked} = e.target;

        if (name === 'is_paused') {
            // If trying to pause the job (checked becomes false)
            if (!checked) {
                setDialogConfig({
                    open: true,
                    title: 'Confirm Status Change',
                    message: 'Are you sure you want to pause this job? It will not run until resumed.',
                    confirmButtonText: 'Pause',
                    confirmButtonColor: 'error',
                    onConfirm: () => {
                        setEditedJob(prev => ({
                            ...prev,
                            is_paused: !checked
                        }));
                    }
                });
            } else {
                // If resuming the job, update directly without confirmation
                setEditedJob(prev => ({
                    ...prev,
                    is_paused: !checked
                }));
            }
        } else {
            setEditedJob(prev => ({
                ...prev,
                [name]: checked
            }));
        }
    };

    const handleSave = async () => {
        try {
            if (!id || !job) return;

            const updatedJob = await jobService.updateJob(id, {
                ...editedJob
            });

            setJob(updatedJob);
            setEditMode(false);
            showNotification('Job updated successfully', 'success');
        } catch (err) {
            console.error('Error updating job:', err);
            showNotification('Failed to update job', 'error');
        }
    };

    const handleTogglePause = async () => {
        console.log('handleTogglePause');
        if (!job || !id) return;
        if (!job.is_paused) {
            setDialogConfig({
                open: true,
                title: 'Confirm Hold',
                message: 'This will hold the job indefinitely until a user resumes it. Do you want to continue?',
                confirmButtonText: 'Hold',
                confirmButtonColor: 'error',
                onConfirm: async () => {
                    try {
                        const updatedJob = await jobService.pauseJob(id);
                        setJob(updatedJob);
                        showNotification('Job paused successfully', 'success');
                    } catch (err) {
                        console.error('Error pausing job:', err);
                        showNotification('Failed to pause job', 'error');
                    }
                }
            });
        } else {
            try {
                const updatedJob = await jobService.resumeJob(id);
                setJob(updatedJob);
                showNotification('Job resumed successfully', 'success');
            } catch (err) {
                console.error('Error resuming job:', err);
                showNotification('Failed to resume job', 'error');
            }
        }
    };

    const handleDeleteClick = () => {
        setDialogConfig({
            open: true,
            title: 'Confirm Delete',
            message: 'Are you sure you want to delete this job? This action cannot be undone.',
            confirmButtonText: 'Delete',
            confirmButtonColor: 'error',
            onConfirm: async () => {
                if (!id) return;
                try {
                    await jobService.deleteJob(id);
                    showNotification('Job deleted successfully', 'success');
                    navigate('/admin/jobs');
                } catch (err) {
                    console.error('Error deleting job:', err);
                    showNotification('Failed to delete job', 'error');
                }
            }
        });
    };

    const closeDialog = () => {
        setDialogConfig(prev => ({...prev, open: false}));
    };

    if (loading) {
        return (
            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px'}}>
                <CircularProgress/>
            </Box>
        );
    }

    if (error ?? !job) {
        return (
            <Box sx={{p: 3}}>
                <Alert severity="error">{error ?? 'Job not found'}</Alert>
            </Box>
        );
    }

    const formatDate = (date: string | Date | null) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleString();
    };

    const getButtonColor = (isPaused: boolean): "success" | "error" => {
        return isPaused ? "success" : "error";
    };

    return (
        <Container maxWidth="md">
            <Box sx={{py: 4}}>
                <Stack spacing={3}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <IconButton onClick={() => {
                            navigate('/admin/jobs');
                        }} size="large">
                            <ArrowBack/>
                        </IconButton>
                        <Typography variant="h4">Job Details</Typography>
                    </Stack>

                    <Card>
                        <CardHeader
                            title="Job Information"
                            action={
                                editMode ? (
                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            startIcon={<Save />}
                                            variant="contained"
                                            onClick={handleSave}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            startIcon={<Cancel />}
                                            variant="outlined"
                                            onClick={handleCancelEdit}
                                        >
                                            Cancel
                                        </Button>
                                    </Stack>
                                ) : (
                                    <>
                                        <Button
                                            variant="contained"
                                            color={getButtonColor(job.is_paused)}
                                            startIcon={job.is_paused ? <PlayArrow /> : <Pause />}
                                            onClick={handleTogglePause}
                                            sx={{ mr: 1 }}
                                        >
                                            {job.is_paused ? 'Resume' : 'Hold'}
                                        </Button>
                                        {
                                            role === 'superadmin' && (
                                                <Button
                                                    variant="contained"
                                                    color="error"
                                                    sx={{mr: 1}}
                                                    onClick={handleDeleteClick}
                                                >
                                                    Delete
                                                </Button>
                                            )
                                        }
                                        <Button
                                            startIcon={<Edit />}
                                            variant="contained"
                                            onClick={handleEditClick}
                                        >
                                            Edit
                                        </Button>
                                    </>
                                )
                            }
                        />
                        <Divider/>
                        <CardContent>
                            <Stack spacing={3}>
                                <TextField
                                    fullWidth
                                    label="Job Name"
                                    name="name"
                                    value={editMode ? editedJob.name : (job.name ?? '')}
                                    onChange={handleTextInputChange}
                                    disabled={!editMode}
                                    required
                                />
                                <TextField
                                    fullWidth
                                    label="Description"
                                    name="description"
                                    value={editMode ? editedJob.description : (job.description ?? '')}
                                    onChange={handleTextInputChange}
                                    disabled={!editMode}
                                    multiline
                                    rows={3}
                                />
                                <TextField
                                    fullWidth
                                    label="Interval (minutes)"
                                    name="interval_minutes"
                                    type="number"
                                    value={editMode ? editedJob.interval_minutes : job.interval_minutes}
                                    onChange={handleTextInputChange}
                                    disabled={!editMode}
                                    required
                                    inputProps={{min: 1}}
                                />
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={editMode ? !editedJob.is_paused : !job.is_paused}
                                                onChange={handleSwitchChange}
                                                name="is_paused"
                                                disabled={!editMode}
                                            />
                                        }
                                        label="Job Active"
                                    />
                                    {editMode && editedJob.is_paused !== job.is_paused && (
                                        <Typography color="error" variant="body2" sx={{fontWeight: 500}}>
                                            * Save changes to apply new status
                                        </Typography>
                                    )}
                                </Box>
                                {!editMode && (
                                    <>
                                        <TextField
                                            fullWidth
                                            label="Last Run"
                                            value={formatDate(job.last_run)}
                                            disabled
                                        />
                                        <TextField
                                            fullWidth
                                            label="Created"
                                            value={formatDate(job.created)}
                                            disabled
                                        />
                                        <TextField
                                            fullWidth
                                            label="Last Modified"
                                            value={formatDate(job.updated)}
                                            disabled
                                        />
                                        {job.deleted && (
                                            <TextField
                                                fullWidth
                                                label="Deleted"
                                                value={formatDate(job.deleted)}
                                                disabled
                                            />
                                        )}
                                    </>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            </Box>

            <ConfirmationDialog
                open={dialogConfig.open}
                onClose={closeDialog}
                onConfirm={dialogConfig.onConfirm}
                title={dialogConfig.title}
                message={dialogConfig.message}
                confirmButtonText={dialogConfig.confirmButtonText}
                confirmButtonColor={dialogConfig.confirmButtonColor}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => {
                    setSnackbar(prev => ({...prev, open: false}))
                }}
                anchorOrigin={{vertical: 'top', horizontal: 'right'}}
            >
                <Alert
                    onClose={() => {
                        setSnackbar(prev => ({...prev, open: false}))
                    }}
                    severity={snackbar.severity}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminJobDetails;