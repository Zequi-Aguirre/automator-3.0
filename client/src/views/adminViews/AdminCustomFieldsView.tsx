// TICKET-152: Admin page for managing lead custom field definitions
import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { Add, Edit, ToggleOff, ToggleOn } from '@mui/icons-material';
import leadCustomFieldService, {
    LeadCustomField,
    LeadCustomFieldCreateDTO,
    LeadCustomFieldUpdateDTO,
    LeadCustomFieldType,
} from '../../services/leadCustomField.service';

const FIELD_TYPES: { value: LeadCustomFieldType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'select', label: 'Select (single)' },
    { value: 'multiselect', label: 'Multi-select' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Yes / No' },
];

interface FieldFormState {
    key: string;
    label: string;
    description: string;
    field_type: LeadCustomFieldType;
    options: string;
    required: boolean;
    sort_order: string;
}

const EMPTY_FORM: FieldFormState = {
    key: '',
    label: '',
    description: '',
    field_type: 'text',
    options: '',
    required: false,
    sort_order: '50',
};

export default function AdminCustomFieldsView() {
    const [fields, setFields] = useState<LeadCustomField[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoDiscoveredCount, setAutoDiscoveredCount] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<LeadCustomField | null>(null);
    const [form, setForm] = useState<FieldFormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [data, count] = await Promise.all([
                leadCustomFieldService.getAll(),
                leadCustomFieldService.getAutoDiscoveredCount(),
            ]);
            setFields(data);
            setAutoDiscoveredCount(count);
        } catch {
            setSnack({ message: 'Failed to load custom fields', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, []);

    const openCreate = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setDialogOpen(true);
    };

    const openEdit = (field: LeadCustomField) => {
        setEditTarget(field);
        setForm({
            key: field.key,
            label: field.label,
            description: field.description ?? '',
            field_type: field.field_type,
            options: field.options ? field.options.join(', ') : '',
            required: field.required,
            sort_order: String(field.sort_order),
        });
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setEditTarget(null);
        setForm(EMPTY_FORM);
    };

    const parseOptions = (raw: string): string[] | null => {
        const items = raw.split(',').map(s => s.trim()).filter(Boolean);
        return items.length > 0 ? items : null;
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editTarget) {
                const data: LeadCustomFieldUpdateDTO = {
                    label: form.label,
                    description: form.description || null,
                    field_type: form.field_type,
                    options: (form.field_type === 'select' || form.field_type === 'multiselect') ? parseOptions(form.options) : null,
                    required: form.required,
                    sort_order: parseInt(form.sort_order, 10) || 50,
                };
                const updated = await leadCustomFieldService.update(editTarget.id, data);
                setFields(prev => prev.map(f => f.id === updated.id ? updated : f));
                setSnack({ message: 'Field updated', severity: 'success' });
            } else {
                const data: LeadCustomFieldCreateDTO = {
                    key: form.key,
                    label: form.label,
                    description: form.description || null,
                    field_type: form.field_type,
                    options: (form.field_type === 'select' || form.field_type === 'multiselect') ? parseOptions(form.options) : null,
                    required: form.required,
                    sort_order: parseInt(form.sort_order, 10) || 50,
                };
                const created = await leadCustomFieldService.create(data);
                setFields(prev => [...prev, created]);
                setSnack({ message: 'Field created', severity: 'success' });
            }
            closeDialog();
        } catch (err) {
            setSnack({ message: err instanceof Error ? err.message : 'Failed to save field', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (field: LeadCustomField) => {
        try {
            const updated = await leadCustomFieldService.setActive(field.id, !field.active);
            setFields(prev => prev.map(f => f.id === updated.id ? updated : f));
            if (!updated.active) setAutoDiscoveredCount(await leadCustomFieldService.getAutoDiscoveredCount());
            setSnack({ message: `Field ${updated.active ? 'activated' : 'deactivated'}`, severity: 'success' });
        } catch {
            setSnack({ message: 'Failed to update field', severity: 'error' });
        }
    };

    const activeFields = fields.filter(f => f.active);
    const inactiveFields = fields.filter(f => !f.active);
    const needsOptions = form.field_type === 'select' || form.field_type === 'multiselect';

    return (
        <Container maxWidth="lg" sx={{ py: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Custom Fields</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Define the dynamic fields collected on leads from external sources.
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={openCreate} size="small">
                    Add Field
                </Button>
            </Stack>

            {autoDiscoveredCount > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {autoDiscoveredCount} auto-discovered {autoDiscoveredCount === 1 ? 'field' : 'fields'} — review and update their labels and types below.
                </Alert>
            )}

            {loading && (
                <Box display="flex" justifyContent="center" py={6}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && (
                <>
                    <Typography variant="subtitle2" fontWeight={600} mb={1} color="text.secondary">
                        ACTIVE FIELDS
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Label</TableCell>
                                    <TableCell>Key</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Required</TableCell>
                                    <TableCell>Order</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {activeFields.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                            No active fields. Add one above.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {activeFields.map(field => (
                                    <TableRow key={field.id} hover>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" gap={1}>
                                                <Typography variant="body2" fontWeight={500}>{field.label}</Typography>
                                                {field.auto_discovered && (
                                                    <Chip label="auto-discovered" size="small" color="warning" variant="outlined" />
                                                )}
                                            </Stack>
                                            {field.description && (
                                                <Typography variant="caption" color="text.secondary">{field.description}</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', px: 0.75, py: 0.25, borderRadius: 0.5 }}>
                                                {field.key}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {FIELD_TYPES.find(t => t.value === field.field_type)?.label ?? field.field_type}
                                            </Typography>
                                            {field.options && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {field.options.join(', ')}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={field.required ? 'Required' : 'Optional'}
                                                size="small"
                                                color={field.required ? 'primary' : 'default'}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>{field.sort_order}</TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" justifyContent="flex-end">
                                                <Tooltip title="Edit">
                                                    <IconButton size="small" onClick={() => { openEdit(field); }}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Deactivate">
                                                    <IconButton size="small" color="success" onClick={() => { void handleToggleActive(field); }}>
                                                        <ToggleOn />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {inactiveFields.length > 0 && (
                        <>
                            <Typography variant="subtitle2" fontWeight={600} mb={1} color="text.secondary">
                                INACTIVE / DEPRECATED
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableBody>
                                        {inactiveFields.map(field => (
                                            <TableRow key={field.id} hover sx={{ opacity: 0.55 }}>
                                                <TableCell>
                                                    <Typography variant="body2">{field.label}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{field.key}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">{field.field_type}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label="Inactive" size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell>{field.sort_order}</TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Activate">
                                                        <IconButton size="small" onClick={() => { void handleToggleActive(field); }}>
                                                            <ToggleOff />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </>
            )}

            {/* Create / Edit dialog */}
            <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editTarget ? 'Edit Field' : 'New Custom Field'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {!editTarget && (
                            <TextField
                                label="Key"
                                size="small"
                                fullWidth
                                value={form.key}
                                onChange={e => { setForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })); }}
                                helperText="snake_case, e.g. time_to_sell — cannot be changed after creation"
                                required
                            />
                        )}
                        {editTarget && (
                            <Box>
                                <Typography variant="caption" color="text.secondary">Key (read-only)</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', px: 1, py: 0.5, borderRadius: 1, mt: 0.5 }}>
                                    {editTarget.key}
                                </Typography>
                            </Box>
                        )}
                        <TextField
                            label="Label"
                            size="small"
                            fullWidth
                            value={form.label}
                            onChange={e => { setForm(f => ({ ...f, label: e.target.value })); }}
                            required
                        />
                        <TextField
                            label="Description (optional)"
                            size="small"
                            fullWidth
                            value={form.description}
                            onChange={e => { setForm(f => ({ ...f, description: e.target.value })); }}
                        />
                        <FormControl size="small" fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select
                                label="Type"
                                value={form.field_type}
                                onChange={e => { setForm(f => ({ ...f, field_type: e.target.value as LeadCustomFieldType })); }}
                            >
                                {FIELD_TYPES.map(t => (
                                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {needsOptions && (
                            <TextField
                                label="Options (comma-separated)"
                                size="small"
                                fullWidth
                                value={form.options}
                                onChange={e => { setForm(f => ({ ...f, options: e.target.value })); }}
                                helperText='e.g. ASAP, 1-3 months, Not sure'
                                required
                            />
                        )}
                        <Stack direction="row" spacing={2} alignItems="center">
                            <FormControlLabel
                                control={<Switch checked={form.required} onChange={e => { setForm(f => ({ ...f, required: e.target.checked })); }} />}
                                label="Required"
                            />
                            <TextField
                                label="Sort order"
                                size="small"
                                type="number"
                                value={form.sort_order}
                                onChange={e => { setForm(f => ({ ...f, sort_order: e.target.value })); }}
                                sx={{ width: 110 }}
                            />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => { void handleSave(); }}
                        disabled={saving || !form.label.trim() || (!editTarget && !form.key.trim()) || (needsOptions && !form.options.trim())}
                    >
                        {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Field'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => { setSnack(null); }} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snack?.severity} onClose={() => { setSnack(null); }}>
                    {snack?.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
