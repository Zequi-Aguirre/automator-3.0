import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    CircularProgress,
    Container,
    Button,
    Paper,
    Stack,
    Chip,
    IconButton,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import { ArrowBack, Edit, Add } from '@mui/icons-material';

import countyService from '../../services/county.service';
import { County } from '../../types/countyTypes';

const AdminCountyDetailsView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [county, setCounty] = useState<County | null>(null);
    const [loading, setLoading] = useState(true);

    // Edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '',
        state: '',
        population: 0,
        timezone: '',
        blacklisted: false,
        whitelisted: false,
        zip_codes: [] as string[]
    });

    // ZIP code management state
    const [newZipCode, setNewZipCode] = useState('');

    const [snack, setSnack] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    useEffect(() => {
        if (id) {
            fetchCountyDetails();
        }
    }, [id]);

    const fetchCountyDetails = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await countyService.getById(id);
            setCounty(data);
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to fetch county: ${errorMessage}`, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEditDialog = () => {
        if (county) {
            setEditFormData({
                name: county.name,
                state: county.state,
                population: county.population,
                timezone: county.timezone,
                blacklisted: county.blacklisted,
                whitelisted: county.whitelisted,
                zip_codes: county.zip_codes || []
            });
            setEditDialogOpen(true);
        }
    };

    const handleSaveEdit = async () => {
        if (!id) return;
        try {
            await countyService.update(id, editFormData);
            setSnack({ open: true, message: 'County updated successfully', severity: 'success' });
            setEditDialogOpen(false);
            fetchCountyDetails();
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to update county: ${errorMessage}`, severity: 'error' });
        }
    };

    const handleAddZipCode = () => {
        if (!newZipCode.trim()) return;

        // Validate 5-digit ZIP code
        if (!/^\d{5}$/.test(newZipCode.trim())) {
            setSnack({ open: true, message: 'ZIP code must be 5 digits', severity: 'error' });
            return;
        }

        const currentZips = editFormData.zip_codes || [];
        if (currentZips.includes(newZipCode.trim())) {
            setSnack({ open: true, message: 'ZIP code already exists', severity: 'error' });
            return;
        }

        setEditFormData({
            ...editFormData,
            zip_codes: [...currentZips, newZipCode.trim()].sort()
        });
        setNewZipCode('');
    };

    const handleRemoveZipCode = (zipCode: string) => {
        setEditFormData({
            ...editFormData,
            zip_codes: editFormData.zip_codes.filter(z => z !== zipCode)
        });
    };

    if (loading) {
        return (
            <Container maxWidth={false}>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    if (!county) {
        return (
            <Container maxWidth={false}>
                <Box sx={{ p: 4 }}>
                    <Typography variant="h5">County not found</Typography>
                    <Button onClick={() => navigate('/a/counties')} sx={{ mt: 2 }}>
                        Back to Counties
                    </Button>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                    <IconButton onClick={() => navigate('/a/counties')} title="Back to counties">
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                        {county.name}, {county.state}
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={handleOpenEditDialog}
                    >
                        Edit County
                    </Button>
                </Box>

                {/* County Info */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">State</Typography>
                            <Typography variant="body1">{county.state}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">Population</Typography>
                            <Typography variant="body1">{county.population?.toLocaleString() || 'N/A'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">Timezone</Typography>
                            <Typography variant="body1">{county.timezone || 'N/A'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {county.blacklisted && <Chip label="Blacklisted" color="error" size="small" />}
                                {county.whitelisted && <Chip label="Whitelisted" color="success" size="small" />}
                                {!county.blacklisted && !county.whitelisted && (
                                    <Chip label="Active" color="default" size="small" />
                                )}
                            </Box>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">County ID</Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                {county.id}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>

                {/* ZIP Codes Section */}
                <Paper sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            ZIP Codes ({county.zip_codes?.length || 0})
                        </Typography>
                    </Box>

                    {county.zip_codes && county.zip_codes.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {county.zip_codes.map((zip) => (
                                <Chip
                                    key={zip}
                                    label={zip}
                                    variant="outlined"
                                    size="small"
                                />
                            ))}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No ZIP codes assigned. Click "Edit County" to add ZIP codes.
                        </Typography>
                    )}
                </Paper>
            </Box>

            {/* Edit County Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Edit County</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Name"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            required
                            fullWidth
                        />
                        <TextField
                            label="State"
                            value={editFormData.state}
                            onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                            required
                            fullWidth
                            inputProps={{ maxLength: 2 }}
                        />
                        <TextField
                            label="Population"
                            type="number"
                            value={editFormData.population}
                            onChange={(e) => setEditFormData({ ...editFormData, population: parseInt(e.target.value) || 0 })}
                            fullWidth
                        />
                        <TextField
                            label="Timezone"
                            value={editFormData.timezone}
                            onChange={(e) => setEditFormData({ ...editFormData, timezone: e.target.value })}
                            fullWidth
                            placeholder="America/New_York"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={editFormData.blacklisted}
                                    onChange={(e) => setEditFormData({ ...editFormData, blacklisted: e.target.checked })}
                                />
                            }
                            label="Blacklisted"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={editFormData.whitelisted}
                                    onChange={(e) => setEditFormData({ ...editFormData, whitelisted: e.target.checked })}
                                />
                            }
                            label="Whitelisted"
                        />

                        {/* ZIP Codes Management */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>ZIP Codes</Typography>
                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                <TextField
                                    size="small"
                                    placeholder="Enter 5-digit ZIP"
                                    value={newZipCode}
                                    onChange={(e) => setNewZipCode(e.target.value)}
                                    inputProps={{ maxLength: 5 }}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddZipCode();
                                        }
                                    }}
                                />
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<Add />}
                                    onClick={handleAddZipCode}
                                >
                                    Add
                                </Button>
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 200, overflow: 'auto' }}>
                                {editFormData.zip_codes.length > 0 ? (
                                    editFormData.zip_codes.map((zip) => (
                                        <Chip
                                            key={zip}
                                            label={zip}
                                            onDelete={() => handleRemoveZipCode(zip)}
                                            size="small"
                                        />
                                    ))
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        No ZIP codes. Add some above.
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveEdit} variant="contained">
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={6000} onClose={() => setSnack({ ...snack, open: false })}>
                <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminCountyDetailsView;
