import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Autocomplete,
    Box,
    Typography,
    CircularProgress,
    Button,
    Card,
    CardContent,
    Chip,
    IconButton,
    Snackbar,
    Alert,
    Stack,
    TextField,
    FormControlLabel,
    Checkbox,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import { ArrowBack, Edit, Add } from '@mui/icons-material';

import countyService from '../../services/county.service';
import buyerService from '../../services/buyer.service';
import { County, CountyBuyerFilterMode } from '../../types/countyTypes';
import { Buyer } from '../../types/buyerTypes';

const AdminCountyDetailsView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [county, setCounty] = useState<County | null>(null);
    const [loading, setLoading] = useState(true);
    const [buyers, setBuyers] = useState<Buyer[]>([]);

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
    const [newZipCode, setNewZipCode] = useState('');

    // Buyer filter state
    const [filterMode, setFilterMode] = useState<CountyBuyerFilterMode | null>(null);
    const [filterBuyerIds, setFilterBuyerIds] = useState<string[]>([]);
    const [filterSaving, setFilterSaving] = useState(false);

    const [snack, setSnack] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    useEffect(() => {
        if (id) {
            fetchCountyDetails();
        }
        fetchBuyers();
    }, [id]);

    const fetchCountyDetails = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await countyService.getById(id);
            setCounty(data);
            setFilterMode(data.buyer_filter_mode);
            setFilterBuyerIds(data.buyer_filter_buyer_ids || []);
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to fetch county: ${errorMessage}`, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchBuyers = async () => {
        try {
            const res = await buyerService.getAll({ page: 1, limit: 100 });
            setBuyers(res.items);
        } catch {
            // non-critical
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
        if (!/^\d{5}$/.test(newZipCode.trim())) {
            setSnack({ open: true, message: 'ZIP code must be 5 digits', severity: 'error' });
            return;
        }
        const currentZips = editFormData.zip_codes || [];
        if (currentZips.includes(newZipCode.trim())) {
            setSnack({ open: true, message: 'ZIP code already exists', severity: 'error' });
            return;
        }
        setEditFormData({ ...editFormData, zip_codes: [...currentZips, newZipCode.trim()].sort() });
        setNewZipCode('');
    };

    const handleRemoveZipCode = (zipCode: string) => {
        setEditFormData({ ...editFormData, zip_codes: editFormData.zip_codes.filter(z => z !== zipCode) });
    };

    const handleSaveBuyerFilter = async () => {
        if (!id) return;
        setFilterSaving(true);
        try {
            const updated = await countyService.updateBuyerFilter(id, { mode: filterMode, buyer_ids: filterBuyerIds });
            setCounty(updated);
            setSnack({ open: true, message: 'Buyer filter saved', severity: 'success' });
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
            setSnack({ open: true, message: `Failed to save filter: ${errorMessage}`, severity: 'error' });
        } finally {
            setFilterSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!county) {
        return (
            <Box sx={{ p: 4 }}>
                <Typography variant="h5">County not found</Typography>
                <Button onClick={() => navigate('/counties')} sx={{ mt: 2 }}>Back to Counties</Button>
            </Box>
        );
    }

    const selectedBuyers = buyers.filter(b => filterBuyerIds.includes(b.id));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 4, overflow: 'auto', height: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={() => navigate('/counties')} title="Back to counties">
                    <ArrowBack />
                </IconButton>
                <Typography variant="h5" sx={{ fontWeight: 600, flexGrow: 1 }}>
                    {county.name}, {county.state}
                </Typography>
                <Button variant="outlined" size="small" startIcon={<Edit />} onClick={handleOpenEditDialog}>
                    Edit County
                </Button>
            </Box>

            {/* County Info Card */}
            <Card variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Details</Typography>
                    <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">State</Typography>
                            <Typography variant="body2">{county.state}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Population</Typography>
                            <Typography variant="body2">{county.population?.toLocaleString() || 'N/A'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Timezone</Typography>
                            <Typography variant="body2">{county.timezone || 'N/A'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Status</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                {county.blacklisted && <Chip label="Blacklisted" color="error" size="small" />}
                                {county.whitelisted && <Chip label="Whitelisted" color="success" size="small" />}
                                {!county.blacklisted && !county.whitelisted && <Chip label="Active" size="small" />}
                            </Box>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">County ID</Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.7rem' }}>
                                {county.id}
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Buyer Routing Filter Card */}
            <Card variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="subtitle1" fontWeight={600}>Buyer Routing Filter</Typography>
                        <Button size="small" variant="contained" onClick={handleSaveBuyerFilter} disabled={filterSaving}>
                            {filterSaving ? 'Saving...' : 'Save'}
                        </Button>
                    </Box>

                    <Stack spacing={2}>
                        <ToggleButtonGroup
                            value={filterMode ?? 'none'}
                            exclusive
                            size="small"
                            onChange={(_, v) => {
                                if (v === null) return;
                                const newMode = v === 'none' ? null : v as CountyBuyerFilterMode;
                                setFilterMode(newMode);
                                if (newMode === null) setFilterBuyerIds([]);
                            }}
                        >
                            <ToggleButton value="none">No Filter</ToggleButton>
                            <ToggleButton value="include">Only send to selected</ToggleButton>
                            <ToggleButton value="exclude">Block selected</ToggleButton>
                        </ToggleButtonGroup>

                        {filterMode !== null && (
                            <Autocomplete
                                multiple
                                size="small"
                                options={buyers}
                                getOptionLabel={(b) => b.name}
                                value={selectedBuyers}
                                onChange={(_, newVal) => setFilterBuyerIds(newVal.map(b => b.id))}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label={filterMode === 'include' ? 'Buyers to allow' : 'Buyers to block'}
                                        placeholder="Select buyers..."
                                    />
                                )}
                                renderTags={(value, getTagProps) =>
                                    value.map((b, index) => (
                                        <Chip label={b.name} size="small" {...getTagProps({ index })} />
                                    ))
                                }
                            />
                        )}

                        {filterMode === null && (
                            <Typography variant="caption" color="text.secondary">
                                No filter applied — leads from this county route to all eligible buyers.
                            </Typography>
                        )}
                    </Stack>
                </CardContent>
            </Card>

            {/* ZIP Codes Card */}
            <Card variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                        ZIP Codes ({county.zip_codes?.length || 0})
                    </Typography>
                    {county.zip_codes && county.zip_codes.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {county.zip_codes.map((zip) => (
                                <Chip key={zip} label={zip} variant="outlined" size="small" />
                            ))}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No ZIP codes assigned. Click "Edit County" to add ZIP codes.
                        </Typography>
                    )}
                </CardContent>
            </Card>

            {/* Edit County Dialog */}
            {editDialogOpen && (
                <Box
                    sx={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1300,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onClick={() => setEditDialogOpen(false)}
                >
                    <Card sx={{ width: 480, maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Edit County</Typography>
                            <Stack spacing={2}>
                                <TextField size="small" label="Name" fullWidth value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />
                                <TextField size="small" label="State" fullWidth value={editFormData.state} onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })} inputProps={{ maxLength: 2 }} />
                                <TextField size="small" label="Population" type="number" fullWidth value={editFormData.population} onChange={(e) => setEditFormData({ ...editFormData, population: parseInt(e.target.value) || 0 })} />
                                <TextField size="small" label="Timezone" fullWidth value={editFormData.timezone} onChange={(e) => setEditFormData({ ...editFormData, timezone: e.target.value })} placeholder="America/New_York" />
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <FormControlLabel control={<Checkbox size="small" checked={editFormData.blacklisted} onChange={(e) => setEditFormData({ ...editFormData, blacklisted: e.target.checked })} />} label={<Typography variant="body2">Blacklisted</Typography>} />
                                    <FormControlLabel control={<Checkbox size="small" checked={editFormData.whitelisted} onChange={(e) => setEditFormData({ ...editFormData, whitelisted: e.target.checked })} />} label={<Typography variant="body2">Whitelisted</Typography>} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>ZIP Codes</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                        <TextField size="small" placeholder="5-digit ZIP" value={newZipCode} onChange={(e) => setNewZipCode(e.target.value)} inputProps={{ maxLength: 5 }} onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddZipCode(); } }} />
                                        <Button size="small" variant="outlined" startIcon={<Add />} onClick={handleAddZipCode}>Add</Button>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 150, overflow: 'auto' }}>
                                        {editFormData.zip_codes.length > 0 ? (
                                            editFormData.zip_codes.map((zip) => (
                                                <Chip key={zip} label={zip} onDelete={() => handleRemoveZipCode(zip)} size="small" />
                                            ))
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">No ZIP codes yet.</Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Stack>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                                <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                                <Button variant="contained" onClick={handleSaveEdit}>Save Changes</Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            )}

            <Snackbar open={snack.open} autoHideDuration={6000} onClose={() => setSnack({ ...snack, open: false })}>
                <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AdminCountyDetailsView;
