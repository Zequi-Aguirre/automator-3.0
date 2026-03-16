import { useEffect, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    Paper,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import roleService from '../../../services/role.service';
import userService from '../../../services/user.service';
import { PermissionRole } from '../../../types/roleTypes';
import { Permission } from '../../../types/userTypes';

const PERMISSION_LABELS: Record<string, string> = {
    'leads.read':              'View Leads',
    'leads.verify':            'Verify Leads',
    'leads.queue':             'Queue Leads',
    'leads.import':            'Import Leads',
    'leads.export':            'Export Leads',
    'leads.send':              'Send Leads',
    'leads.trash':             'Trash Leads',
    'leads.edit':              'Edit Leads',
    'leads.untrash':           'Untrash Leads',
    'leads.call_request':      'Request Calls',
    'leads.call_execute':      'Execute Calls',
    'leads.view_verified':     'View Verified Tab',
    'leads.view_needs_review': 'View Needs Review Tab',
    'leads.view_needs_call':   'View Needs Call Tab',
    'sources.manage':          'Manage Sources',
    'buyers.manage':           'Manage Buyers',
    'buyers.hold':             'Hold Buyers',
    'managers.manage':         'Manage Managers',
    'counties.manage':         'Manage Counties',
    'logs.view':               'View Logs',
    'worker.toggle':           'Toggle Worker',
    'settings.manage':         'Manage Settings',
    'users.manage':            'Manage Users',
    'users.approve':           'Approve Users',
    'activity.view':           'View Activity',
    'trash_reasons.manage':    'Manage Trash Reasons',
    'disputes.create':         'Create Disputes',
};

const permLabel = (perm: string) =>
    PERMISSION_LABELS[perm] ?? perm.split('.').slice(1).join(' ').replace(/_/g, ' ');

const EMPTY_FORM = { name: '', permissions: [] as Permission[] };

const AdminRolesSection = () => {
    const [roles, setRoles] = useState<PermissionRole[]>([]);
    const [availablePerms, setAvailablePerms] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editRole, setEditRole] = useState<PermissionRole | null>(null);
    const [form, setForm] = useState<{ name: string; permissions: Permission[] }>(EMPTY_FORM);
    const [deleteTarget, setDeleteTarget] = useState<PermissionRole | null>(null);
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const data = await roleService.getAll();
            setRoles(data);
        } catch {
            setSnack({ open: true, message: 'Failed to load roles', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchRoles();
        userService.getAvailablePermissions().then(setAvailablePerms).catch(() => {});
    }, []);

    const openCreate = () => {
        setEditRole(null);
        setForm(EMPTY_FORM);
        setDialogOpen(true);
    };

    const openEdit = (role: PermissionRole) => {
        setEditRole(role);
        setForm({ name: role.name, permissions: role.permissions });
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setEditRole(null);
        setForm(EMPTY_FORM);
    };

    const handleTogglePerm = (perm: Permission) => {
        setForm(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm],
        }));
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            if (editRole) {
                const updated = await roleService.update(editRole.id, form.name, form.permissions);
                setRoles(prev => prev.map(r => r.id === updated.id ? updated : r));
                setSnack({ open: true, message: 'Role updated', severity: 'success' });
            } else {
                const created = await roleService.create(form.name, form.permissions);
                setRoles(prev => [...prev, created]);
                setSnack({ open: true, message: 'Role created', severity: 'success' });
            }
            closeDialog();
        } catch {
            setSnack({ open: true, message: 'Failed to save role', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await roleService.delete(deleteTarget.id);
            setRoles(prev => prev.filter(r => r.id !== deleteTarget.id));
            setSnack({ open: true, message: 'Role deleted', severity: 'success' });
        } catch {
            setSnack({ open: true, message: 'Failed to delete role', severity: 'error' });
        } finally {
            setDeleteTarget(null);
        }
    };

    return (
        <Container maxWidth={false} sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Permission Roles</Typography>
                    <Button variant="contained" onClick={openCreate}>New Role</Button>
                </Box>

                {loading
                    ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                    : (
                        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                            <TableContainer component={Paper} sx={{ height: '100%' }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Permissions</TableCell>
                                            <TableCell align="right" />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {roles.map(role => (
                                            <TableRow key={role.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>{role.name}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                                        <Chip
                                                            label={`${role.permissions.length} permissions`}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                        {role.permissions.slice(0, 5).map(p => (
                                                            <Chip key={p} label={permLabel(p)} size="small" />
                                                        ))}
                                                        {role.permissions.length > 5 && (
                                                            <Chip label={`+${role.permissions.length - 5} more`} size="small" variant="outlined" />
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                        <IconButton size="small" onClick={() => openEdit(role)}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(role)}>
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {roles.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center">
                                                    <Typography variant="body2" color="text.disabled">No roles yet</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )
                }
            </Box>

            {/* Create / Edit dialog */}
            <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <span>{editRole ? `Edit — ${editRole.name}` : 'New Role'}</span>
                        <Chip
                            label={`${form.permissions.length} permissions selected`}
                            size="small"
                            color={form.permissions.length > 0 ? 'primary' : 'default'}
                            variant="outlined"
                        />
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ maxHeight: 520, p: 0 }}>
                    <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                        <TextField
                            label="Role name"
                            value={form.name}
                            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                            size="small"
                            fullWidth
                            autoFocus
                        />
                    </Box>

                    {Object.keys(availablePerms).length === 0
                        ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
                        : Object.entries(availablePerms).map(([group, perms]) => {
                            const groupPerms = perms as Permission[];
                            const selectedInGroup = groupPerms.filter(p => form.permissions.includes(p)).length;
                            const allSelected = selectedInGroup === groupPerms.length;
                            const someSelected = selectedInGroup > 0 && !allSelected;
                            const toggleGroup = () => {
                                setForm(prev => ({
                                    ...prev,
                                    permissions: allSelected
                                        ? prev.permissions.filter(p => !groupPerms.includes(p))
                                        : [...new Set([...prev.permissions, ...groupPerms])],
                                }));
                            };
                            return (
                                <Accordion key={group} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, borderBottom: 1, borderColor: 'divider' }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
                                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, mr: 1 }}>
                                            <Checkbox
                                                size="small"
                                                checked={allSelected}
                                                indeterminate={someSelected}
                                                onChange={e => { e.stopPropagation(); toggleGroup(); }}
                                                onClick={e => e.stopPropagation()}
                                                sx={{ p: 0.5 }}
                                            />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                                                {group.replace(/_/g, ' ')}
                                            </Typography>
                                            <Chip
                                                label={`${selectedInGroup} / ${groupPerms.length}`}
                                                size="small"
                                                color={selectedInGroup > 0 ? 'primary' : 'default'}
                                                variant={selectedInGroup > 0 ? 'filled' : 'outlined'}
                                            />
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ px: 3, pt: 0, pb: 1.5 }}>
                                        <Stack direction="row" flexWrap="wrap">
                                            {groupPerms.map(perm => (
                                                <FormControlLabel
                                                    key={perm}
                                                    label={permLabel(perm)}
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={form.permissions.includes(perm)}
                                                            onChange={() => handleTogglePerm(perm)}
                                                        />
                                                    }
                                                    sx={{ minWidth: 150 }}
                                                />
                                            ))}
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })
                    }
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        disabled={saving || !form.name.trim()}
                        onClick={() => { void handleSave(); }}
                    >
                        {saving ? 'Saving…' : editRole ? 'Save' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <DialogTitle>Delete role?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Delete <strong>{deleteTarget?.name}</strong>? This won't affect users who already have these permissions.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={() => { void handleDelete(); }}>Delete</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack(p => ({ ...p, open: false }))}>
                <Alert severity={snack.severity} onClose={() => setSnack(p => ({ ...p, open: false }))} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminRolesSection;
