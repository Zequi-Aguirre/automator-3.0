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
import {ArrowBack, Edit, Save, Cancel} from '@mui/icons-material';
import leadsService from '../../services/lead.service';
import {Lead} from '../../types/leadTypes';
import DataContext from "../../context/DataContext";

const AdminLeadDetails = () => {
    const {id} = useParams<{ id: string }>();
    const {oldDatabase} = useContext(DataContext);
    const navigate = useNavigate();

    const [lead, setLead] = useState<Lead | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [migrateDialogOpen, setMigrateDialogOpen] = useState(false);
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

    const showNotification = (message: string, severity: 'success' | 'error') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    const fetchLead = useCallback(async () => {
        try {
            if (!id) return;
            setLoading(true);
            const response = await leadsService.getLeadById(id, oldDatabase);
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
        } catch (err) {
            setError('Failed to load lead details');
            console.error('Error fetching lead:', err);
        } finally {
            setLoading(false);
        }
    }, [id, oldDatabase]);

    useEffect(() => {
        fetchLead();
    }, [fetchLead]);

    const handleEditClick = () => {
        setEditMode(true);
    };

    const handleMigrateLead = async () => {
        try {
            if (!id) return;
            setLoading(true);
            const newLeadId = await leadsService.migrateLead(id);
            showNotification('Lead migrated successfully', 'success');
            // Navigate to the new lead ID in the new database context
            navigate(`/a/leads/${newLeadId}`);
        } catch (error) {
            showNotification('Failed to migrate lead', 'error');
            console.error("Error migrating the lead:", error);
        } finally {
            setLoading(false);
            setMigrateDialogOpen(false);
        }
    };

    const handleTrashLead = async () => {
        try {
            if (!id) return;
            await leadsService.trashLead(id, oldDatabase);
            navigate('/a/leads');
            showNotification('Lead moved to trash successfully', 'success');
        } catch (error) {
            showNotification('Failed to trash lead', 'error');
            console.error("Error trashing the lead:", error);
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
        const {name, value} = e.target;
        setEditedContact(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async () => {
        try {
            if (!id || !lead) return;
            await leadsService.updateLead(id, {
                ...lead,
                ...editedContact
            }, oldDatabase);
            setEditMode(false);
            await fetchLead();
            showNotification('Lead information updated successfully', 'success');
        } catch (err) {
            console.error('Error updating lead:', err);
            showNotification('Failed to update lead information', 'error');
        }
    };

    const renderHeaderActions = () => {
        if (editMode) {
            return (
                <Stack direction="row" spacing={1}>
                    <Button
                        startIcon={<Save/>}
                        variant="contained"
                        onClick={handleSave}
                    >
                        Save
                    </Button>
                    <Button
                        startIcon={<Cancel/>}
                        variant="outlined"
                        onClick={handleCancelEdit}
                    >
                        Cancel
                    </Button>
                </Stack>
            );
        }

        return (
            <>
                <Button
                    variant="contained"
                    color="error"
                    sx={{mr: 1}}
                    onClick={() => setConfirmDialogOpen(true)}
                >
                    Trash
                </Button>
                {oldDatabase ? (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setMigrateDialogOpen(true)}
                    >
                        Migrate to New Database
                    </Button>
                ) : (
                    <Button
                        startIcon={<Edit/>}
                        variant="contained"
                        onClick={handleEditClick}
                    >
                        Edit
                    </Button>
                )}
            </>
        );
    };

    if (loading) {
        return (
            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px'}}>
                <CircularProgress/>
            </Box>
        );
    }

    if (error || !lead) {
        return (
            <Box sx={{p: 3}}>
                <Alert severity="error">{error ?? 'Lead not found'}</Alert>
            </Box>
        );
    }

    return (
        <Container maxWidth="md">
            <Box sx={{py: 4}}>
                <Stack spacing={3}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <IconButton onClick={() => navigate('/a/leads')} size="large">
                            <ArrowBack/>
                        </IconButton>
                        <Typography variant="h4">Lead Details</Typography>
                    </Stack>

                    <Card>
                        <CardHeader
                            title="Lead Information"
                            action={renderHeaderActions()}
                        />
                        <Divider/>
                        <CardContent>
                            <Stack spacing={3}>
                                <Stack direction="row" spacing={2}>
                                    <TextField
                                        fullWidth
                                        label="First Name"
                                        name="first_name"
                                        value={editMode ? editedContact.first_name : lead.first_name}
                                        onChange={handleInputChange}
                                        disabled={!editMode}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Last Name"
                                        name="last_name"
                                        value={editMode ? editedContact.last_name : lead.last_name}
                                        onChange={handleInputChange}
                                        disabled={!editMode}
                                    />
                                </Stack>
                                <TextField
                                    fullWidth
                                    label="Email"
                                    name="email"
                                    value={editMode ? editedContact.email : lead.email}
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                />
                                <TextField
                                    fullWidth
                                    label="Phone"
                                    name="phone"
                                    value={editMode ? editedContact.phone : lead.phone}
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                />
                                <TextField
                                    fullWidth
                                    label="Address"
                                    name="address"
                                    value={editMode ? editedContact.address : lead.address}
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                />
                                <Stack direction="row" spacing={2}>
                                    <TextField
                                        fullWidth
                                        label="City"
                                        name="city"
                                        value={editMode ? editedContact.city : lead.city}
                                        onChange={handleInputChange}
                                        disabled={!editMode}
                                    />
                                    <TextField
                                        fullWidth
                                        label="State"
                                        name="state"
                                        value={editMode ? editedContact.state : lead.state}
                                        onChange={handleInputChange}
                                        disabled={!editMode}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Zip Code"
                                        name="zipcode"
                                        value={editMode ? editedContact.zipcode : lead.zipcode}
                                        onChange={handleInputChange}
                                        disabled={!editMode}
                                    />
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            </Box>

            {/* Confirmation Dialog for Trash */}
            <Dialog
                open={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
            >
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to move this lead to trash? This action can be undone from the trash
                        section.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleTrashLead} color="error" variant="contained">
                        Move to Trash
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Dialog for Migration */}
            <Dialog
                open={migrateDialogOpen}
                onClose={() => setMigrateDialogOpen(false)}
            >
                <DialogTitle>Confirm Migration</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to migrate this lead to the new database? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMigrateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleMigrateLead} color="primary" variant="contained">
                        Migrate Lead
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({...prev, open: false}))}
                anchorOrigin={{vertical: 'top', horizontal: 'right'}}
            >
                <Alert
                    onClose={() => setSnackbar(prev => ({...prev, open: false}))}
                    severity={snackbar.severity}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminLeadDetails;