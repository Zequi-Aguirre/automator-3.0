import {useCallback, useContext, useEffect, useState} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    Container,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Divider,
    IconButton,
    Stack,
    TextField,
    Typography,
    Alert,
    Snackbar
} from '@mui/material';
import ActivityFeed from '../activityFeed/ActivityFeed';
import activityService from '../../../services/activity.service';
import { ActivityLog } from '../../../types/activityTypes';
import { ArrowBack, Edit, Save, Cancel } from '@mui/icons-material';
import leadsService from '../../../services/lead.service';
import { Lead } from '../../../types/leadTypes';
import { DateTime } from 'luxon';
import {
    remainingMs,
    formatRemaining,
    getUrgency,
    colorForUrgency
} from '../../../utils/leadExpiry';
import LeadVerificationForm from "./leadVerificationForm/leadVerificationForm.tsx";
import workingsService from "../../../services/settings.service.tsx";
import DataContext from "../../../context/DataContext.tsx";
import { usePermissions } from '../../../hooks/usePermissions';
import { Permission } from '../../../types/userTypes';

const LeadDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { role } = useContext(DataContext)
    const isAdmin = role.includes('admin')
    const { can } = usePermissions();
    const [lead, setLead] = useState<Lead | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [editedContact, setEditedContact] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipcode: ''
    });
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const [now, setNow] = useState(DateTime.utc());
    const [leadExpireHours, setLeadExpireHours] = useState(18); // default to 18 hours
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);

    useEffect(() => {
        // Fetch worker settings to get expire_after_hours
        const fetchSettings = async () => {
            try {
                const settings = await workingsService.getWorkerSettings();
                setLeadExpireHours(settings.expire_after_hours);
            } catch (error) {
                console.error("Error fetching worker settings:", error);
            }
        };
        fetchSettings();

        const id = setInterval(() => {
            setNow(DateTime.utc());
        }, 60_000);
        return () => {
            clearInterval(id);
        };
    }, []);

    const showNotification = (message: string, severity: 'success' | 'error') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    const fetchActivity = useCallback(async () => {
        if (!id) return;
        setActivityLoading(true);
        try {
            const logs = await activityService.getByLead(id);
            setActivityLogs(logs);
        } catch (err) {
            console.error('Failed to load activity:', err);
        } finally {
            setActivityLoading(false);
        }
    }, [id]);

    const fetchLead = useCallback(async () => {
        try {
            if (!id) return;
            setLoading(true);
            const response = await leadsService.getLeadById(id);
            setLead(response);
            setEditedContact({
                first_name: response.first_name,
                last_name: response.last_name,
                email: response.email,
                phone: response.phone,
                address: response.address,
                city: response.city,
                state: response.state,
                zipcode: response.zipcode
            });
            setError(null);
            setEditMode(false);
            setIsLocked(response.verified || response.sent);
        } catch (err) {
            setError('Failed to load lead details');
            console.error('Error fetching lead:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchLead();
        fetchActivity();
    }, [fetchLead, fetchActivity]);

    const handleEditClick = () => {
        if (!lead) return;
        if (isLocked) {
            return;
        }
        setEditMode(true);
    };

    const handleTrashLead = async () => {
        try {
            if (!id) return;
            await leadsService.trashLead(id);
            const url = isAdmin ? '/a/leads' : '/u/leads';
            navigate(url);
            showNotification('Lead moved to trash successfully', 'success');
        } catch (error) {
            showNotification('Failed to trash lead', 'error');
            console.error('Error trashing the lead:', error);
        }
        setConfirmDialogOpen(false);
    };

    const handleCancelEdit = () => {
        if (!lead) return;
        setEditMode(false);
        setEditedContact({
            first_name: lead.first_name,
            last_name: lead.last_name,
            email: lead.email,
            phone: lead.phone,
            address: lead.address,
            city: lead.city,
            state: lead.state,
            zipcode: lead.zipcode
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedContact(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async () => {
        try {
            if (!id || !lead) return;

            if (isLocked) {
                return;
            }

            await leadsService.updateLead(id, {
                ...lead,
                ...editedContact
            });
            setEditMode(false);
            await fetchLead();
            showNotification('Lead information updated successfully', 'success');
        } catch (err) {
            console.error('Error updating lead:', err);
            showNotification('Failed to update lead information', 'error');
        }
    };

    const renderExpiresBanner = () => {
        if (!lead?.created) return null;
        const ms = remainingMs(lead.created, now, leadExpireHours);
        const label = formatRemaining(ms);
        const urgency = getUrgency(ms);
        const color = colorForUrgency(urgency);

        return (
            <Typography
                variant="body2"
                sx={{ color, fontWeight: label === 'Expired' ? 700 : 600, textTransform: 'uppercase' }}
            >
                Expires in: {label}
            </Typography>
        );
    };

    const handleCopyAddress = () => {
        if (!lead) return;

        const fullAddress = `${lead.address}, ${lead.city}, ${lead.state} ${lead.zipcode}`;

        navigator.clipboard.writeText(fullAddress)
            .then(() => {
                showNotification('Address copied to clipboard', 'success');
            })
            .catch(() => {
                showNotification('Failed to copy address', 'error');
            });
    };

    const handleOpenGoogleSearch = () => {
        if (!lead) return;

        const fullAddress = `${lead.address}, ${lead.city}, ${lead.state} ${lead.zipcode}`;
        const encoded = encodeURIComponent(fullAddress);

        const url = `https://www.google.com/search?q=${encoded}`;

        window.open(url, "_blank");
    };

    const renderHeaderActions = () => {
        if (!lead) return null;
        if (editMode) {
            return (
                <Stack direction="column" spacing={1} alignItems="flex-end">
                    {renderExpiresBanner()}
                    <Stack direction="row" spacing={1}>
                        <Button
                            startIcon={<Save />}
                            variant="contained"
                            onClick={handleSave}
                            disabled={isLocked}
                        >
                            Save
                        </Button>
                        <Button
                            startIcon={<Cancel />}
                            variant="outlined"
                            onClick={handleCancelEdit}
                            disabled={isLocked}
                        >
                            Cancel
                        </Button>
                    </Stack>
                </Stack>
            );
        }

        return (
            <Stack direction="column" spacing={1} alignItems="flex-end">
                {renderExpiresBanner()}
                <Stack direction="row" spacing={1}>
                    {can(Permission.LEADS_TRASH) && (
                        <Button
                            variant="contained"
                            color="error"
                            sx={{ mr: 1 }}
                            onClick={() => {
                                setConfirmDialogOpen(true);
                            }}
                            disabled={lead.sent}
                        >
                            Trash
                        </Button>
                    )}
                    <Button
                        startIcon={<Edit />}
                        variant="contained"
                        onClick={handleEditClick}
                        disabled={isLocked}
                    >
                        Edit
                    </Button>
                </Stack>
            </Stack>
        );
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error ?? !lead) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error ?? 'Lead not found'}</Alert>
            </Box>
        );
    }

    return (
        <Container maxWidth="md">
            <Box sx={{ py: 4 }}>
                <Stack spacing={3}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <IconButton
                            onClick={() => {
                                const url = isAdmin ? '/a/leads' : '/u/leads';
                                navigate(url);
                            }}
                            size="large"
                        >
                            <ArrowBack />
                        </IconButton>

                        <Typography variant="h4">Lead Details</Typography>

                        {!editMode && lead && (
                            <>
                                <Button
                                    variant="outlined"
                                    onClick={handleCopyAddress}
                                >
                                    Copy Address
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={handleOpenGoogleSearch}
                                >
                                    See on Google
                                </Button>
                            </>
                        )}
                    </Stack>

                    <Card>
                        <CardHeader title="Lead Information" action={renderHeaderActions()} />
                        <Divider />
                        <CardContent>
                            <Stack spacing={3}>
                                <Stack direction="row" spacing={2}>
                                    <TextField
                                        fullWidth
                                        label="First Name"
                                        name="first_name"
                                        value={editMode ? editedContact.first_name : lead.first_name}
                                        onChange={handleInputChange}
                                        disabled={!editMode || isLocked}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Last Name"
                                        name="last_name"
                                        value={editMode ? editedContact.last_name : lead.last_name}
                                        onChange={handleInputChange}
                                        disabled={!editMode || isLocked}
                                    />
                                </Stack>
                                <TextField
                                    fullWidth
                                    label="Email"
                                    name="email"
                                    value={editMode ? editedContact.email : lead.email}
                                    onChange={handleInputChange}
                                    disabled={!editMode || isLocked}
                                />
                                <TextField
                                    fullWidth
                                    label="Phone"
                                    name="phone"
                                    value={editMode ? editedContact.phone : lead.phone}
                                    onChange={handleInputChange}
                                    disabled={!editMode || isLocked}
                                />
                                <TextField
                                    fullWidth
                                    label="Address"
                                    name="address"
                                    value={editMode ? editedContact.address : lead.address}
                                    onChange={handleInputChange}
                                    disabled={!editMode || isLocked}
                                />
                                <Stack direction="row" spacing={2}>
                                    <TextField
                                        fullWidth
                                        label="City"
                                        name="city"
                                        value={editMode ? editedContact.city : lead.city}
                                        onChange={handleInputChange}
                                        disabled={!editMode || isLocked}
                                    />
                                    <TextField
                                        fullWidth
                                        label="State"
                                        name="state"
                                        value={editMode ? editedContact.state : lead.state}
                                        onChange={handleInputChange}
                                        disabled={!editMode || isLocked}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Zip Code"
                                        name="zipcode"
                                        value={editMode ? editedContact.zipcode : lead.zipcode}
                                        onChange={handleInputChange}
                                        disabled={!editMode || isLocked}
                                    />
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            </Box>

            {!editMode && lead && can(Permission.LEADS_VERIFY) && (
                <LeadVerificationForm
                    lead={lead}
                    refreshLead={fetchLead}
                />)
            }

            <Box sx={{ mt: 3, mb: 4 }}>
                <Card>
                    <CardHeader title="Activity" titleTypographyProps={{ variant: 'h6' }} />
                    <Divider />
                    <CardContent sx={{ p: 0 }}>
                        <ActivityFeed logs={activityLogs} loading={activityLoading} />
                    </CardContent>
                </Card>
            </Box>

            <Dialog
                open={confirmDialogOpen}
                onClose={() => {
                    setConfirmDialogOpen(false);
                }}
            >
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to move this lead to trash? This action can be undone from the trash section.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setConfirmDialogOpen(false);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleTrashLead} color="error" variant="contained">
                        Move to Trash
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => {
                    setSnackbar(prev => ({ ...prev, open: false }));
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => {
                        setSnackbar(prev => ({ ...prev, open: false }));
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

export default LeadDetails;