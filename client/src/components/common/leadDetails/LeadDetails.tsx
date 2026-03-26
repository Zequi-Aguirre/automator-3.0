import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
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
    Snackbar,
    Tooltip
} from '@mui/material';
import ActivityFeed from '../activityFeed/ActivityFeed';
import activityService from '../../../services/activity.service';
import { ActivityLog } from '../../../types/activityTypes';
import { ArrowBack, Edit, Save, Cancel, RestoreFromTrash } from '@mui/icons-material';
import leadsService from '../../../services/lead.service';
import trashReasonService, { TrashReason } from '../../../services/trashReason.service';
import { Lead } from '../../../types/leadTypes';
import { DateTime } from 'luxon';
import {
    remainingMs,
    formatRemaining,
    getUrgency,
    colorForUrgency
} from '../../../utils/leadExpiry';
import LeadVerificationForm from "./leadVerificationForm/leadVerificationForm.tsx";
import LeadCustomFieldsCard from "./LeadCustomFieldsCard.tsx";
import workingsService from "../../../services/settings.service.tsx";
import { usePermissions } from '../../../hooks/usePermissions';
import { Permission } from '../../../types/userTypes';

const LeadDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { can } = usePermissions();
    const canEdit = can(Permission.LEADS_EDIT);
    const canTrash = can(Permission.LEADS_TRASH);
    const canUntrash = can(Permission.LEADS_UNTRASH);

    const [lead, setLead] = useState<Lead | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [trashReasons, setTrashReasons] = useState<TrashReason[]>([]);
    const [selectedTrashReason, setSelectedTrashReason] = useState<TrashReason | null>(null);
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
    const [leadExpireHours, setLeadExpireHours] = useState(18);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await workingsService.getWorkerSettings();
                setLeadExpireHours(settings.expire_after_hours);
            } catch {
                // use default
            }
        };
        void fetchSettings();
        const intervalId = setInterval(() => { setNow(DateTime.utc()); }, 60_000);
        return () => { clearInterval(intervalId); };
    }, []);

    const showNotification = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const fetchActivity = useCallback(async () => {
        if (!id) return;
        setActivityLoading(true);
        try {
            const logs = await activityService.getByLead(id);
            setActivityLogs(logs);
        } catch {
            // non-critical
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
        } catch {
            setError('Failed to load lead details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void fetchLead();
        void fetchActivity();
    }, [fetchLead, fetchActivity]);

    const isLocked = lead ? (lead.verified || !!lead.deleted) : false;
    const isTrashed = !!lead?.deleted;

    const handleEditClick = () => {
        if (!lead || isLocked || !canEdit) return;
        setEditMode(true);
    };

    const handleOpenTrashDialog = async () => {
        setSelectedTrashReason(null);
        setConfirmDialogOpen(true);
        try {
            const reasons = await trashReasonService.getActive();
            setTrashReasons(reasons);
        } catch {
            setTrashReasons([]);
        }
    };

    const handleTrashLead = async () => {
        try {
            if (!id) return;
            if (!selectedTrashReason) return;
            await leadsService.trashLead(id, selectedTrashReason.label);
            navigate('/leads');
        } catch {
            showNotification('Failed to trash lead', 'error');
        }
        setConfirmDialogOpen(false);
    };

    const handleUntrashLead = async () => {
        try {
            if (!id) return;
            await leadsService.untrashLead(id);
            await fetchLead();
            void fetchActivity();
            showNotification('Lead restored from trash', 'success');
        } catch {
            showNotification('Failed to restore lead', 'error');
        }
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
        setEditedContact(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        try {
            if (!id || !lead || isLocked) return;
            await leadsService.updateLead(id, { ...lead, ...editedContact });
            setEditMode(false);
            await fetchLead();
            void fetchActivity();
            showNotification('Lead updated', 'success');
        } catch {
            showNotification('Failed to update lead', 'error');
        }
    };

    const handleCopyAddress = () => {
        if (!lead) return;
        const addr = `${lead.address}, ${lead.city}, ${lead.state} ${lead.zipcode}`;
        navigator.clipboard.writeText(addr)
            .then(() => { showNotification('Address copied', 'success'); })
            .catch(() => { showNotification('Failed to copy address', 'error'); });
    };

    const handleOpenGoogleSearch = () => {
        if (!lead) return;
        const addr = encodeURIComponent(`${lead.address}, ${lead.city}, ${lead.state} ${lead.zipcode}`);
        window.open(`https://www.google.com/search?q=${addr}`, '_blank');
    };

    const renderExpiresBanner = () => {
        if (!lead?.created || isTrashed) return null;
        const ms = remainingMs(lead.created, now, leadExpireHours);
        const label = formatRemaining(ms);
        const urgency = getUrgency(ms);
        const color = colorForUrgency(urgency);
        return (
            <Typography variant="body2" sx={{ color, fontWeight: urgency === 'expired' ? 700 : 600, textTransform: 'uppercase' }}>
                {urgency === 'expired' ? 'Expired' : `Expires in: ${label}`}
            </Typography>
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

    // ─── Layout ───────────────────────────────────────────────────────────────
    // Full-height 2-column layout:
    //   Left  (fixed, no scroll): Lead info card + Activity feed
    //   Right (scrollable):       Lead verification form
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <Container maxWidth={false} disableGutters sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
            {/* Top bar */}
            <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <IconButton onClick={() => { navigate('/leads'); }} size="small">
                    <ArrowBack />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Lead Details</Typography>
                {isTrashed && <Chip label="Trashed" color="error" size="small" />}
                {lead.verified && !isTrashed && <Chip label="Verified" color="success" size="small" />}
                {!editMode && (
                    <>
                        <Button variant="outlined" size="small" onClick={handleCopyAddress}>Copy Address</Button>
                        <Button variant="outlined" size="small" onClick={handleOpenGoogleSearch}>See on Google</Button>
                    </>
                )}
                <Box sx={{ flex: 1 }} />
                {renderExpiresBanner()}
            </Box>

            {/* 2-column body */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* ── LEFT: Lead info + Activity (fixed, no scroll) ── */}
                <Box sx={{ width: 600, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: 1, borderColor: 'divider', overflow: 'hidden' }}>

                    {/* Lead Info card */}
                    <Card square elevation={0} sx={{ flexShrink: 0 }}>
                        <CardHeader
                            title="Lead Info"
                            titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
                            action={
                                <Stack direction="row" spacing={0.5}>
                                    {isTrashed && canUntrash && (
                                        <Tooltip title="Restore from trash">
                                            <IconButton size="small" color="warning" onClick={() => { void handleUntrashLead(); }}>
                                                <RestoreFromTrash fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {!isTrashed && !editMode && canTrash && (
                                        <Tooltip title="Trash lead">
                                            <IconButton size="small" color="error" onClick={() => { void handleOpenTrashDialog(); }}>
                                                <Cancel fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {!isTrashed && !editMode && (
                                        <Tooltip title={!canEdit ? "You don't have permission to edit leads" : isLocked ? "Verified leads cannot be edited" : "Edit lead"}>
                                            <span>
                                                <IconButton size="small" disabled={!canEdit || isLocked} onClick={handleEditClick}>
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    )}
                                    {editMode && (
                                        <>
                                            <IconButton size="small" color="primary" onClick={() => { void handleSave(); }}>
                                                <Save fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={handleCancelEdit}>
                                                <Cancel fontSize="small" />
                                            </IconButton>
                                        </>
                                    )}
                                </Stack>
                            }
                            sx={{ pb: 0.5 }}
                        />
                        <Divider />
                        <CardContent sx={{ pt: 1.5 }}>
                            <Stack spacing={1.5}>
                                <Stack direction="row" spacing={1}>
                                    <TextField
                                        fullWidth size="small" label="First Name" name="first_name"
                                        value={editMode ? editedContact.first_name : lead.first_name}
                                        onChange={handleInputChange}
                                        disabled={!editMode}
                                        InputProps={{ readOnly: !editMode }}
                                    />
                                    <TextField
                                        fullWidth size="small" label="Last Name" name="last_name"
                                        value={editMode ? editedContact.last_name : lead.last_name}
                                        onChange={handleInputChange}
                                        disabled={!editMode}
                                        InputProps={{ readOnly: !editMode }}
                                    />
                                </Stack>
                                <TextField
                                    fullWidth size="small" label="Email" name="email"
                                    value={editMode ? editedContact.email : lead.email}
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                    InputProps={{ readOnly: !editMode }}
                                />
                                <TextField
                                    fullWidth size="small" label="Phone" name="phone"
                                    value={editMode ? editedContact.phone : lead.phone}
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                    InputProps={{ readOnly: !editMode }}
                                />
                                <TextField
                                    fullWidth size="small" label="Address" name="address"
                                    value={editMode ? editedContact.address : lead.address}
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                    InputProps={{ readOnly: !editMode }}
                                />
                                <Stack direction="row" spacing={1}>
                                    <TextField
                                        fullWidth size="small" label="City" name="city"
                                        value={editMode ? editedContact.city : lead.city}
                                        onChange={handleInputChange}
                                        disabled={!editMode}
                                        InputProps={{ readOnly: !editMode }}
                                    />
                                    <TextField
                                        sx={{ width: 80 }} size="small" label="State" name="state"
                                        value={editMode ? editedContact.state : lead.state}
                                        onChange={handleInputChange}
                                        disabled={!editMode}
                                        InputProps={{ readOnly: !editMode }}
                                    />
                                    <TextField
                                        sx={{ width: 100 }} size="small" label="Zip" name="zipcode"
                                        value={editMode ? editedContact.zipcode : lead.zipcode}
                                        onChange={handleInputChange}
                                        disabled={!editMode}
                                        InputProps={{ readOnly: !editMode }}
                                    />
                                </Stack>
                                <TextField
                                    fullWidth size="small" label="County"
                                    value={lead.county ?? '—'}
                                    disabled
                                    InputProps={{ readOnly: true }}
                                />
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* TICKET-152: Custom fields — shown when lead has custom_fields data */}
                    <LeadCustomFieldsCard lead={lead} />

                    {/* Activity feed — fills remaining left height */}
                    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight={700}>Activity</Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ flex: 1, overflow: 'auto' }}>
                            <ActivityFeed logs={activityLogs} loading={activityLoading} />
                        </Box>
                    </Box>
                </Box>

                {/* ── RIGHT: Verification form (scrollable) ── */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {isTrashed && (
                        <Alert severity="warning" sx={{ mb: 1 }}>
                            This lead has been trashed and cannot be verified or edited.
                            {canUntrash && (
                                <Button size="small" color="warning" onClick={() => { void handleUntrashLead(); }} sx={{ ml: 2 }}>
                                    Restore
                                </Button>
                            )}
                        </Alert>
                    )}
                    <LeadVerificationForm
                        lead={lead}
                        refreshLead={fetchLead}
                        refreshActivity={fetchActivity}
                    />
                </Box>
            </Box>

            {/* Trash confirm dialog */}
            <Dialog open={confirmDialogOpen} onClose={() => { setConfirmDialogOpen(false); }} maxWidth="xs" fullWidth>
                <DialogTitle>Move to Trash?</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Are you sure you want to move this lead to trash? You can restore it later.
                    </DialogContentText>
                    <Autocomplete
                        options={trashReasons}
                        getOptionLabel={(o) => o.label}
                        value={selectedTrashReason}
                        onChange={(_, val) => { setSelectedTrashReason(val); }}
                        renderInput={(params) => (
                            <TextField {...params} label="Reason" size="small" fullWidth required error={trashReasons.length > 0 && !selectedTrashReason} />
                        )}
                        size="small"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setConfirmDialogOpen(false); }}>Cancel</Button>
                    <Button onClick={() => { void handleTrashLead(); }} color="error" variant="contained" disabled={!selectedTrashReason}>Move to Trash</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={() => { setSnackbar(prev => ({ ...prev, open: false })); }}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => { setSnackbar(prev => ({ ...prev, open: false })); }}
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
