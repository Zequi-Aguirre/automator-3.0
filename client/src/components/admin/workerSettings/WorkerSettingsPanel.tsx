import {useCallback, useEffect, useState} from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    Container,
    Divider,
    FormControlLabel,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import { Cancel, Edit, Save } from '@mui/icons-material';
import {EditableWorkerSettings, WorkerSettings} from '../../../types/settingsTypes';
import workerSettingsService from '../../../services/settings.service.tsx';

type SnackbarState = {
    open: boolean;
    message: string;
    severity: 'success' | 'error';
};

const formatDateTimeReadable = (value?: string | Date | null): string => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
};

const hhmmToMinutes = (value: string): number => {
    if (!value) return 0;
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
};

const minutesToHHMM = (value: number): string => {
    if (value == null || Number.isNaN(value)) return "";
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

const buildEditableFromSettings = (settings: WorkerSettings): EditableWorkerSettings => ({
    name: settings.name ?? "",
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
            setSnackbar({ open: true, message: 'Settings updated successfully', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: 'Failed to update settings', severity: 'error' });
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error ?? !settings) {
        return <Box sx={{ p: 3 }}><Alert severity="error">{error ?? 'Settings not found'}</Alert></Box>;
    }

    return (
        <Container maxWidth="md">
            <Box sx={{ py: 4 }}>
                <Stack spacing={3}>
                    <Typography variant="h5" fontWeight={600}>Worker Settings</Typography>
                    <Card>
                        <CardHeader
                            title="Configuration"
                            action={
                                editMode ? (
                                    <Stack direction="row" spacing={1}>
                                        <Button startIcon={<Save />} variant="contained" onClick={handleSave}>Save</Button>
                                        <Button startIcon={<Cancel />} variant="outlined" onClick={() => { setEditMode(false); setEditedSettings(buildEditableFromSettings(settings)); }}>Cancel</Button>
                                    </Stack>
                                ) : (
                                    <Button startIcon={<Edit />} variant="contained" onClick={() => setEditMode(true)}>Edit</Button>
                                )
                            }
                        />
                        <Divider />
                        <CardContent>
                            <Stack spacing={3}>
                                <TextField fullWidth label="Name" name="name" value={editMode ? editedSettings.name : settings.name} onChange={handleInputChange} disabled={!editMode} />
                                <TextField fullWidth label="Business Hours Start" name="business_hours_start" type="time" value={editMode ? editedSettings.business_hours_start : minutesToHHMM(settings.business_hours_start)} onChange={handleInputChange} disabled={!editMode} InputLabelProps={{ shrink: true }} />
                                <TextField fullWidth label="Business Hours End" name="business_hours_end" type="time" value={editMode ? editedSettings.business_hours_end : minutesToHHMM(settings.business_hours_end)} onChange={handleInputChange} disabled={!editMode} InputLabelProps={{ shrink: true }} />
                                <FormControlLabel
                                    control={<Switch checked={editMode ? editedSettings.enforce_expiration : settings.enforce_expiration} onChange={handleInputChange} name="enforce_expiration" disabled={!editMode} />}
                                    label="Enforce Expiration"
                                />
                                {(editMode ? editedSettings.enforce_expiration : settings.enforce_expiration) && (
                                    <TextField fullWidth label="Expire After (hours)" name="expire_after_hours" type="number" value={editMode ? editedSettings.expire_after_hours : settings.expire_after_hours} onChange={handleInputChange} disabled={!editMode} helperText="Leads older than this will be trashed" />
                                )}
                                <FormControlLabel
                                    control={<Switch checked={editMode ? editedSettings.auto_queue_on_verify : settings.auto_queue_on_verify} onChange={handleInputChange} name="auto_queue_on_verify" disabled={!editMode} />}
                                    label="Auto-Queue on Verify"
                                />
                                <TextField fullWidth label="Worker Enabled" value={settings.worker_enabled ? 'Yes' : 'No'} disabled />
                                <TextField fullWidth label="Last Worker Run" value={formatDateTimeReadable(settings.last_worker_run ?? null)} disabled />
                                <TextField fullWidth label="Last Modified" value={formatDateTimeReadable(settings.modified ?? null)} disabled />
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            </Box>
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert onClose={() => setSnackbar(p => ({ ...p, open: false }))} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Container>
    );
};

export default WorkerSettingsPanel;
