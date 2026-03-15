import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    FormControlLabel,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import { Cancel, Edit, Save } from '@mui/icons-material';
import { EditableWorkerSettings, WorkerSettings } from '../../../types/settingsTypes';
import workerSettingsService from '../../../services/settings.service.tsx';

type SnackbarState = {
    open: boolean;
    message: string;
    severity: 'success' | 'error';
};

const formatDateTimeReadable = (value?: string | Date | null): string => {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
};

const hhmmToMinutes = (value: string): number => {
    if (!value) return 0;
    const [h, m] = value.split(':').map(Number);
    return h * 60 + m;
};

const minutesToHHMM = (value: number): string => {
    if (value == null || Number.isNaN(value)) return '';
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const buildEditableFromSettings = (settings: WorkerSettings): EditableWorkerSettings => ({
    name: settings.name ?? '',
    business_hours_start: minutesToHHMM(settings.business_hours_start),
    business_hours_end: minutesToHHMM(settings.business_hours_end),
    expire_after_hours: settings.expire_after_hours ?? 0,
    enforce_expiration: settings.enforce_expiration ?? true,
    auto_queue_on_verify: settings.auto_queue_on_verify ?? false,
});

const WorkerSettingsPanel = () => {
    const [settings, setSettings] = useState<WorkerSettings | null>(null);
    const [editedSettings, setEditedSettings] = useState<EditableWorkerSettings>({
        name: '',
        business_hours_start: '',
        business_hours_end: '',
        expire_after_hours: 0,
        enforce_expiration: true,
        auto_queue_on_verify: false,
    });
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await workerSettingsService.getWorkerSettings();
            if (response) {
                setSettings(response);
                setEditedSettings(buildEditableFromSettings(response));
            } else {
                setError('Settings not found');
            }
        } catch {
            setError('Failed to load worker settings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = event.target;
        setEditedSettings((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value),
        }));
    };

    const handleSave = async () => {
        if (!settings) return;
        try {
            await workerSettingsService.updateSettings({
                name: editedSettings.name,
                business_hours_start: hhmmToMinutes(editedSettings.business_hours_start),
                business_hours_end: hhmmToMinutes(editedSettings.business_hours_end),
                expire_after_hours: editedSettings.expire_after_hours,
                enforce_expiration: editedSettings.enforce_expiration,
                auto_queue_on_verify: editedSettings.auto_queue_on_verify,
            });
            setEditMode(false);
            await fetchSettings();
            setSnackbar({ open: true, message: 'Settings updated', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: 'Failed to update settings', severity: 'error' });
        }
    };

    const handleCancel = () => {
        setEditMode(false);
        if (settings) setEditedSettings(buildEditableFromSettings(settings));
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error ?? !settings) {
        return <Box sx={{ p: 4 }}><Alert severity="error">{error ?? 'Settings not found'}</Alert></Box>;
    }

    const enforceExpiration = editMode ? editedSettings.enforce_expiration : settings.enforce_expiration;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 4 }}>
            {/* Editable config */}
            <Card variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600}>Configuration</Typography>
                        {editMode ? (
                            <Stack direction="row" spacing={1}>
                                <Button size="small" variant="contained" startIcon={<Save />} onClick={handleSave}>Save</Button>
                                <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={handleCancel}>Cancel</Button>
                            </Stack>
                        ) : (
                            <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => setEditMode(true)}>Edit</Button>
                        )}
                    </Box>

                    <Stack spacing={2}>
                        <TextField
                            size="small"
                            fullWidth
                            label="Name"
                            name="name"
                            value={editMode ? editedSettings.name : settings.name}
                            onChange={handleInputChange}
                            disabled={!editMode}
                        />

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                size="small"
                                fullWidth
                                label="Business Hours Start"
                                name="business_hours_start"
                                type="time"
                                value={editMode ? editedSettings.business_hours_start : minutesToHHMM(settings.business_hours_start)}
                                onChange={handleInputChange}
                                disabled={!editMode}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                size="small"
                                fullWidth
                                label="Business Hours End"
                                name="business_hours_end"
                                type="time"
                                value={editMode ? editedSettings.business_hours_end : minutesToHHMM(settings.business_hours_end)}
                                onChange={handleInputChange}
                                disabled={!editMode}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                            <FormControlLabel
                                sx={{ m: 0 }}
                                control={
                                    <Switch
                                        size="small"
                                        checked={enforceExpiration}
                                        onChange={handleInputChange}
                                        name="enforce_expiration"
                                        disabled={!editMode}
                                    />
                                }
                                label={<Typography variant="body2">Enforce Expiration</Typography>}
                            />
                            {enforceExpiration && (
                                <TextField
                                    size="small"
                                    label="Expire After (hours)"
                                    name="expire_after_hours"
                                    type="number"
                                    value={editMode ? editedSettings.expire_after_hours : settings.expire_after_hours}
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                    helperText="Leads older than this will be trashed"
                                    sx={{ width: 220 }}
                                    inputProps={{ min: 1 }}
                                />
                            )}
                        </Box>

                        <FormControlLabel
                            sx={{ m: 0 }}
                            control={
                                <Switch
                                    size="small"
                                    checked={editMode ? editedSettings.auto_queue_on_verify : settings.auto_queue_on_verify}
                                    onChange={handleInputChange}
                                    name="auto_queue_on_verify"
                                    disabled={!editMode}
                                />
                            }
                            label={<Typography variant="body2">Auto-Queue on Verify</Typography>}
                        />
                    </Stack>
                </CardContent>
            </Card>

            {/* Read-only status */}
            <Card variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Status</Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    <Stack direction="row" spacing={4} flexWrap="wrap">
                        <Box>
                            <Typography variant="caption" color="text.secondary">Worker Enabled</Typography>
                            <Typography variant="body2">{settings.worker_enabled ? 'Yes' : 'No'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Last Worker Run</Typography>
                            <Typography variant="body2">{formatDateTimeReadable(settings.last_worker_run)}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Last Modified</Typography>
                            <Typography variant="body2">{formatDateTimeReadable(settings.modified)}</Typography>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar(p => ({ ...p, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default WorkerSettingsPanel;
