import {useCallback, useEffect, useState} from 'react';
import jobService from "../../../services/job.service";
import AdminJobsTable from "./adminJobsTable/AdminJobsTable.tsx";
import CustomPagination from "../../Pagination";
import {
    Box,
    Typography,
    CircularProgress,
    Container,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Switch,
    Alert,
    Snackbar
} from "@mui/material";
import {Add as AddIcon} from '@mui/icons-material';
import {Job} from "../../../types/jobTypes";

const INITIAL_JOB_STATE = {
    name: '',
    description: '',
    interval_minutes: 60,
    is_paused: false
};

const AdminJobsSection = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [page, setPage] = useState(1);
    const [jobCount, setJobCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState(50);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newJob, setNewJob] = useState(INITIAL_JOB_STATE);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const showNotification = useCallback((message: string, severity: 'success' | 'error') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    }, []);

    const fetchJobs = useCallback(async () => {
        try {
            const response = await jobService.getAll();
            setJobs(response);
            setJobCount(response.length);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            showNotification('Failed to fetch jobs', 'error');
        }
    }, [showNotification]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const handleCreateModalClose = useCallback(() => {
        setCreateModalOpen(false);
        setNewJob(INITIAL_JOB_STATE);
    }, []);

    const handleInputChange = useCallback((
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const {name, value, type} = e.target;

        if (name === 'interval_minutes') {
            const numValue = parseInt(value, 10);
            if (isNaN(numValue) || numValue < 1) {
                return;
            }
            setNewJob(prev => ({
                ...prev,
                [name]: numValue
            }));
            return;
        }

        const inputValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setNewJob(prev => ({
            ...prev,
            [name]: inputValue
        }));
    }, []);

    const handleCreateJob = useCallback(async () => {
        try {
            if (!newJob.name.trim()) {
                showNotification('Job name is required', 'error');
                return;
            }

            if (!newJob.interval_minutes || newJob.interval_minutes < 1) {
                showNotification('Valid interval minutes are required', 'error');
                return;
            }

            const createdJob = await jobService.createJob({
                name: newJob.name,
                description: newJob.description,
                interval_minutes: newJob.interval_minutes
            });

            setJobs(prev => [createdJob, ...prev]);
            setJobCount(prev => prev + 1);
            handleCreateModalClose();
            showNotification('Job created successfully', 'success');
        } catch (error) {
            console.error('Error creating job:', error);
            showNotification('Failed to create job', 'error');
        }
    }, [newJob, showNotification, handleCreateModalClose]);

    const handleSnackbarClose = useCallback(() => {
        setSnackbar(prev => ({...prev, open: false}));
    }, []);

    return (
        <Container maxWidth={false} sx={{height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0}}>
            <Box sx={{p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden'}}>
                <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
                    <Typography variant="h4" component="h2" sx={{fontWeight: 'bold'}}>
                        Jobs
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon/>}
                        onClick={() => {
                            setCreateModalOpen(true);
                        }}
                    >
                        Create New
                    </Button>
                </Box>

                {loading
                    ? (
                        <Box sx={{display: 'flex', justifyContent: 'center', p: 4}}>
                            <CircularProgress/>
                        </Box>
                    )
                    : (
                        <Box sx={{display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden'}}>
                            <Box sx={{flexGrow: 1, overflow: 'auto', minHeight: 0}}>
                                <AdminJobsTable
                                    jobs={jobs}
                                    setJobs={setJobs}
                                />
                            </Box>
                            <Box sx={{backgroundColor: 'background.paper'}}>
                                <CustomPagination
                                    page={page}
                                    setPage={setPage}
                                    rows={jobCount}
                                    limit={limit}
                                    setLimit={setLimit}
                                />
                            </Box>
                        </Box>
                    )}
            </Box>

            <Dialog
                open={createModalOpen}
                onClose={handleCreateModalClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Create New Job</DialogTitle>
                <DialogContent>
                    <Box sx={{mt: 2, display: 'flex', flexDirection: 'column', gap: 2}}>
                        <TextField
                            fullWidth
                            label="Job Name"
                            name="name"
                            value={newJob.name}
                            onChange={handleInputChange}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Description"
                            name="description"
                            value={newJob.description}
                            onChange={handleInputChange}
                            multiline
                            rows={3}
                        />
                        <TextField
                            fullWidth
                            label="Interval (minutes)"
                            name="interval_minutes"
                            type="number"
                            value={newJob.interval_minutes}
                            onChange={handleInputChange}
                            required
                            inputProps={{min: 1}}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={!newJob.is_paused}
                                    onChange={(e) => {
                                        setNewJob(prev => ({
                                            ...prev,
                                            is_paused: !e.target.checked
                                        }));
                                    }}
                                    name="is_paused"
                                />
                            }
                            label="Start Job Immediately"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCreateModalClose}>Cancel</Button>
                    <Button
                        onClick={handleCreateJob}
                        variant="contained"
                        disabled={!newJob.name.trim() || !newJob.interval_minutes}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{vertical: 'top', horizontal: 'right'}}
            >
                <Alert
                    onClose={handleSnackbarClose}
                    severity={snackbar.severity}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminJobsSection;