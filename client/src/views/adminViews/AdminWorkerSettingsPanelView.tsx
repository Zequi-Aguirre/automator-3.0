import { useCallback, useEffect, useState } from 'react';
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
    MenuItem,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Cancel, Edit, Save } from '@mui/icons-material';
import {EditableWorkerSettings, WorkerSettings} from '../../types/settingsTypes';
import workerSettingsService from '../../services/settings.service.tsx';
import { US_STATES } from '../../constants/usStates';

type SnackbarState = {
    open: boolean;
    message: string;
    severity: 'success' | 'error';
};

const formatDateTimeLocal = (value?: string | Date | null): string => {
    if (!value) {
        return '';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');

    // HTML datetime-local expects: YYYY-MM-DDTHH:mm
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDateTimeReadable = (value?: string | Date | null): string => {
    if (!value) {
        return '';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

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

    return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
};

const buildEditableFromSettings = (settings: WorkerSettings): EditableWorkerSettings => {
    return {
        name: settings.name ?? "",
        business_hours_start: minutesToHHMM(settings.business_hours_start),
        business_hours_end: minutesToHHMM(settings.business_hours_end),
        minutes_range_start: settings.minutes_range_start ?? 0,
        minutes_range_end: settings.minutes_range_end ?? 0,
        delay_same_state: settings.delay_same_state ?? 0,
        delay_same_county: settings.delay_same_county ?? 0,
        delay_same_investor: settings.delay_same_investor ?? 0,
        send_next_lead_at: formatDateTimeLocal(settings.send_next_lead_at),
        states_on_hold: settings.states_on_hold ?? [],
    };
};

const WorkerSettingsPanel = () => {
    const [settings, setSettings] = useState<WorkerSettings | null>(null);
    const [editedSettings, setEditedSettings] = useState<EditableWorkerSettings>({
        name: '',
        business_hours_start: '',
        business_hours_end: '',
        minutes_range_start: 0,
        minutes_range_end: 0,
        delay_same_state: 0,
        delay_same_county: 0,
        delay_same_investor: 0,
        send_next_lead_at: '',
        states_on_hold: [],
    });
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'success',
    });

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
        } catch (err) {
            console.error('Error fetching settings:', err);
            setError('Failed to load worker settings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleEditClick = () => {
        if (!settings) {
            return;
        }

        setEditedSettings(buildEditableFromSettings(settings));
        setEditMode(true);
    };

    const showNotification = (message: string, severity: 'success' | 'error') => {
        setSnackbar({
            open: true,
            message,
            severity,
        });
    };

    const handleCancelEdit = () => {
        if (!settings) {
            return;
        }

        setEditMode(false);
        setEditedSettings(buildEditableFromSettings(settings));
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = event.target;

        setEditedSettings((prev) => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value,
        }));
    };

    const handleStatesOnHoldChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { value } = event.target;

        const values = Array.isArray(value)
            ? value
            : typeof value === 'string'
                ? value.split(',').map((v) => v.trim()).filter((v) => v.length > 0)
                : [];

        setEditedSettings((prev) => ({
            ...prev,
            states_on_hold: values as string[],
        }));
    };

    const handleSave = async () => {
        try {
            if (!settings) {
                return;
            }

            await workerSettingsService.updateSettings({
                name: editedSettings.name,
                business_hours_start: hhmmToMinutes(editedSettings.business_hours_start),
                business_hours_end: hhmmToMinutes(editedSettings.business_hours_end),
                minutes_range_start: editedSettings.minutes_range_start,
                minutes_range_end: editedSettings.minutes_range_end,
                delay_same_state: editedSettings.delay_same_state,
                delay_same_county: editedSettings.delay_same_county,
                delay_same_investor: editedSettings.delay_same_investor,
                send_next_lead_at: editedSettings.send_next_lead_at
                    ? new Date(editedSettings.send_next_lead_at).toISOString()
                    : null,
                states_on_hold: editedSettings.states_on_hold
            });

            setEditMode(false);
            await fetchSettings();
            showNotification('Settings updated successfully', 'success');
        } catch (err) {
            console.error('Error updating settings:', err);
            showNotification('Failed to update settings', 'error');
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
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error ?? 'Settings not found'}</Alert>
            </Box>
        );
    }

    return (
        <Container maxWidth="md">
            <Box sx={{ py: 4 }}>
                <Stack spacing={3}>
                    <Typography variant="h4">Worker Settings</Typography>

                    <Card>
                        <CardHeader
                            title="Settings Configuration"
                            action={
                                editMode
                                    ? (
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
                                )
                                    : (
                                    <Button
                                        startIcon={<Edit />}
                                        variant="contained"
                                        onClick={handleEditClick}
                                    >
                                        Edit
                                    </Button>
                                )
                            }
                        />
                        <Divider />
                        <CardContent>
                            <Stack spacing={3}>
                                {/* Name */}
                                <TextField
                                    fullWidth
                                    label="Name"
                                    name="name"
                                    value={editMode ? editedSettings.name : settings.name}
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                />

                                {/* Business hours */}
                                <TextField
                                    fullWidth
                                    label="Business Hours Start"
                                    name="business_hours_start"
                                    type="time"
                                    value={
                                        editMode
                                            ? editedSettings.business_hours_start
                                            : minutesToHHMM(settings.business_hours_start)
                                    }
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                    InputLabelProps={{ shrink: true }}
                                />

                                <TextField
                                    fullWidth
                                    label="Business Hours End"
                                    name="business_hours_end"
                                    type="time"
                                    value={
                                        editMode
                                            ? editedSettings.business_hours_end
                                            : minutesToHHMM(settings.business_hours_end)
                                    }
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                    InputLabelProps={{ shrink: true }}
                                />

                                {/* Minutes range */}
                                <TextField
                                    fullWidth
                                    label="Minutes Range Start"
                                    name="minutes_range_start"
                                    type="number"
                                    value={
                                        editMode
                                            ? editedSettings.minutes_range_start
                                            : settings.minutes_range_start
                                    }
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                />
                                <TextField
                                    fullWidth
                                    label="Minutes Range End"
                                    name="minutes_range_end"
                                    type="number"
                                    value={
                                        editMode
                                            ? editedSettings.minutes_range_end
                                            : settings.minutes_range_end
                                    }
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                />

                                {/* Delays */}
                                <TextField
                                    fullWidth
                                    label="Delay Same State (days)"
                                    name="delay_same_state"
                                    type="number"
                                    value={
                                        editMode
                                            ? editedSettings.delay_same_state
                                            : settings.delay_same_state
                                    }
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                />
                                <TextField
                                    fullWidth
                                    label="Delay Same County (hours)"
                                    name="delay_same_county"
                                    type="number"
                                    value={
                                        editMode
                                            ? editedSettings.delay_same_county
                                            : settings.delay_same_county
                                    }
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                />
                                <TextField
                                    fullWidth
                                    label="Delay Same Investor (days)"
                                    name="delay_same_investor"
                                    type="number"
                                    value={
                                        editMode
                                            ? editedSettings.delay_same_investor
                                            : settings.delay_same_investor
                                    }
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                />

                                {/* Send next lead at */}
                                <TextField
                                    fullWidth
                                    label="Send Next Lead At"
                                    name="send_next_lead_at"
                                    type="datetime-local"
                                    value={
                                        editMode
                                            ? editedSettings.send_next_lead_at
                                            : formatDateTimeLocal(settings.send_next_lead_at ?? null)
                                    }
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                    InputLabelProps={{ shrink: true }}
                                />

                                {/* States on hold */}
                                <TextField
                                    select
                                    fullWidth
                                    label="States on Hold"
                                    name="states_on_hold"
                                    value={
                                        editMode
                                            ? editedSettings.states_on_hold
                                            : settings.states_on_hold ?? []
                                    }
                                    SelectProps={{ multiple: true }}
                                    onChange={handleStatesOnHoldChange}
                                    disabled={!editMode}
                                >
                                    {US_STATES.map((state) => (
                                        <MenuItem key={state} value={state}>
                                            {state}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                {/* Read-only info */}
                                <TextField
                                    fullWidth
                                    label="Last Worker Run"
                                    value={formatDateTimeReadable(settings.last_worker_run ?? null)}
                                    disabled
                                />
                                <TextField
                                    fullWidth
                                    label="Last Modified"
                                    value={formatDateTimeReadable(settings.modified ?? null)}
                                    disabled
                                />
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            </Box>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => {
                    setSnackbar((prev) => ({ ...prev, open: false }));
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => {
                        setSnackbar((prev) => ({ ...prev, open: false }));
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

export default WorkerSettingsPanel;