import { Button, Box, Snackbar, Alert } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faTrash } from "@fortawesome/free-solid-svg-icons";
import { GridRenderCellParams } from "@mui/x-data-grid";
import { useContext, useState } from 'react';
import ConfirmationDialog from '../../../../common/confirmationDialog.tsx';
import {User} from "../../../../../types/userTypes.ts";
import DataContext from "../../../../../context/DataContext.tsx";

interface JobActionsCellProps {
    params: GridRenderCellParams;
    loadingJobs: Record<string, boolean>;
    handleRunNow: (id: string) => Promise<void>;
    handleTogglePause: (id: string, isPaused: boolean) => Promise<void>;
    handleDeleteJob: (id: string) => Promise<void>;
    loggedInUser: User;
}

interface DialogConfig {
    open: boolean;
    title: string;
    message: string;
    confirmButtonText: string;
    confirmButtonColor?: 'error' | 'warning' | 'primary' | 'success';
    onConfirm: () => void;
}

interface SnackbarState {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
}

const getButtonColor = (isPaused: boolean): "success" | "error" => {
    return isPaused ? "success" : "error";
};

const AdminJobsTableActions = ({
                            params,
                            loadingJobs,
                            handleRunNow,
                            handleTogglePause,
                            handleDeleteJob,
                        }: JobActionsCellProps) => {
    const { role } = useContext(DataContext)
    const [dialogConfig, setDialogConfig] = useState<DialogConfig>({
        open: false,
        title: '',
        message: '',
        confirmButtonText: '',
        confirmButtonColor: 'error',
        onConfirm: () => {}
    });

    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'success'
    });

    const handlePauseClick = (id: string, isPaused: boolean) => {
        if (!isPaused) {
            setDialogConfig({
                open: true,
                title: 'Confirm Hold',
                message: 'This will hold the job indefinitely until a user resumes it. Do you want to continue?',
                confirmButtonText: 'Hold',
                confirmButtonColor: 'error',
                onConfirm: async () => {
                    console.log('Holding job:', id);
                    try {
                        await handleTogglePause(id, isPaused);
                    } catch (error) {
                        console.error('Error pausing job:', error);
                        throw error;
                    }
                }
            });
        } else {
            handleResumeJob(id, isPaused);
        }
    };

    const handleResumeJob = async (id: string, isPaused: boolean) => {
        try {
            await handleTogglePause(id, isPaused);
        } catch (error) {
            console.error('Error resuming job:', error);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDialogConfig({
            open: true,
            title: 'Confirm Delete',
            message: 'Are you sure you want to delete this job? This action cannot be undone.',
            confirmButtonText: 'Delete',
            confirmButtonColor: 'error',
            onConfirm: async () => {
                try {
                    await handleDeleteJob(id);
                    setSnackbar({
                        open: true,
                        message: 'Job deleted successfully',
                        severity: 'success'
                    });
                } catch (error) {
                    setSnackbar({
                        open: true,
                        message: 'Failed to delete job',
                        severity: 'error'
                    });
                }
            }
        });
    };

    const closeDialog = () => {
        setDialogConfig(prev => ({ ...prev, open: false }));
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    return (
        <>
            <Box display="flex" gap={1}>
                <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRunNow(params.row.id);
                    }}
                    disabled={loadingJobs[params.row.id] || params.row.is_paused}
                >
                    RUN NOW &nbsp;&nbsp; <FontAwesomeIcon icon={faPlay} />
                </Button>
                <Button
                    variant="contained"
                    color={getButtonColor(params.row.is_paused)}
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        handlePauseClick(params.row.id, params.row.is_paused);
                    }}
                    disabled={loadingJobs[params.row.id]}
                >
                    {params.row.is_paused ? 'Resume' : 'Hold'}
                </Button>
                {
                    role === 'superadmin' && (
                        <Button
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(params.row.id);
                            }}
                            disabled={loadingJobs[params.row.id]}
                        >
                            <FontAwesomeIcon icon={faTrash}/>
                        </Button>
                    )
                }
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
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default AdminJobsTableActions;