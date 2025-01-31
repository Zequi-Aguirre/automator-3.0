import {useCallback, useEffect, useState} from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    Container,
    Divider,
    Stack,
    TextField,
    Typography,
    Alert,
    Snackbar,
    Switch,
    FormControlLabel
} from '@mui/material';
import {Edit, Save, Cancel} from '@mui/icons-material';
import {WorkerSettings} from '../../types/settingsTypes';
import workerSettingsService from '../../services/settings.service.tsx';

const WorkerSettingsPanel = () => {
    const [settings, setSettings] = useState<WorkerSettings | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editedSettings, setEditedSettings] = useState({
        name: '',
        business_hours_start: '',
        business_hours_end: '',
        minutes_range_start: 0,
        minutes_range_end: 0,
        delay_same_state: 0,
        getting_leads: false,
        pause_app: false,
        counties_on_hold: [] as string[],
        states_on_hold: [] as string[],
    });
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            const response = await workerSettingsService.getWorkerSettings();
            if (response) {
                setSettings(response);
                setEditedSettings({
                    name: response.name,
                    business_hours_start: response.business_hours_start ?? 0,
                    business_hours_end: response.business_hours_end ?? 0,
                    minutes_range_start: response.minutes_range_start ?? 0,
                    minutes_range_end: response.minutes_range_end ?? 0,
                    delay_same_state: response.delay_same_state ?? 0,
                    getting_leads: response.getting_leads,
                    pause_app: response.pause_app,
                    counties_on_hold: response.counties_on_hold,
                    states_on_hold: response.states_on_hold,
                });
            }
        } catch (err) {
            setError('Failed to load worker settings');
            console.error('Error fetching settings:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleEditClick = () => {
        setEditMode(true);
    };

    const showNotification = (message: string, severity: 'success' | 'error') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    const handleCancelEdit = () => {
        if (!settings) return;
        setEditMode(false);
        setEditedSettings({
            name: settings.name,
            business_hours_start: settings.business_hours_start ?? 0,
            business_hours_end: settings.business_hours_end ?? 0,
            minutes_range_start: settings.minutes_range_start ?? 0,
            minutes_range_end: settings.minutes_range_end ?? 0,
            delay_same_state: settings.delay_same_state ?? 0,
            getting_leads: settings.getting_leads,
            pause_app: settings.pause_app,
            counties_on_hold: settings.counties_on_hold,
            states_on_hold: settings.states_on_hold,
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value, type} = e.target;
        setEditedSettings(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, checked} = e.target;
        setEditedSettings(prev => ({
            ...prev,
            [name]: checked
        }));
    };

    const handleSave = async () => {
        try {
            if (!settings) return;
            await workerSettingsService.updateSettings(editedSettings);
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
            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px'}}>
                <CircularProgress/>
            </Box>
        );
    }

    if (error ?? !settings) {
        return (
            <Box sx={{p: 3}}>
                <Alert severity="error">{error ?? 'Settings not found'}</Alert>
            </Box>
        );
    }

    return (
        <Container maxWidth="md">
            <Box sx={{py: 4}}>
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
                                    )
                                    : (
                                        <Button
                                            startIcon={<Edit/>}
                                            variant="contained"
                                            onClick={handleEditClick}
                                        >
                                            Edit
                                        </Button>
                                    )
                            }
                        />
                        <Divider/>
                        <CardContent>
                            <Stack spacing={3}>
                                <TextField
                                    fullWidth
                                    label="Name"
                                    name="name"
                                    value={editMode ? editedSettings.name : settings.name}
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                />
                                <TextField
                                    fullWidth
                                    label="Business Hours Start"
                                    name="business_hours_start"
                                    type="time"
                                    value={editMode ? editedSettings.business_hours_start : settings.business_hours_start}
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                />
                                <TextField
                                    fullWidth
                                    label="Business Hours End"
                                    name="business_hours_end"
                                    type="time"
                                    value={editMode ? editedSettings.business_hours_end : settings.business_hours_end}
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                />
                                <TextField
                                    fullWidth
                                    label="Minutes Range Start"
                                    name="minutes_range_start"
                                    type="number"
                                    value={editMode ? editedSettings.minutes_range_start : settings.minutes_range_start}
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                />
                                <TextField
                                    fullWidth
                                    label="Minutes Range End"
                                    name="minutes_range_end"
                                    type="number"
                                    value={editMode ? editedSettings.minutes_range_end : settings.minutes_range_end}
                                    onChange={handleInputChange}
                                    disabled={!editMode}
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={editMode ? editedSettings.getting_leads : settings.getting_leads}
                                            onChange={handleSwitchChange}
                                            name="getting_leads"
                                            disabled={!editMode}
                                        />
                                    }
                                    label="Getting Leads"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={editMode ? editedSettings.pause_app : settings.pause_app}
                                            onChange={handleSwitchChange}
                                            name="pause_app"
                                            disabled={!editMode}
                                        />
                                    }
                                    label="Pause App"
                                />
                                {!editMode && (
                                    <>
                                        <TextField
                                            fullWidth
                                            label="Created"
                                            value={settings.created.toLocaleString()}
                                            disabled
                                        />
                                        <TextField
                                            fullWidth
                                            label="Last Modified"
                                            value={settings.modified.toLocaleString()}
                                            disabled
                                        />
                                    </>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            </Box>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => {
                    setSnackbar(prev => ({...prev, open: false}))
                }}
                anchorOrigin={{vertical: 'top', horizontal: 'right'}}
            >
                <Alert
                    onClose={() => {
                        setSnackbar(prev => ({...prev, open: false}))
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