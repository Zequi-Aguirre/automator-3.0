import { useEffect, useState } from 'react';
import {
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
import roleService from '../../../services/role.service';
import userService from '../../../services/user.service';
import { PermissionRole } from '../../../types/roleTypes';
import { Permission } from '../../../types/userTypes';

const permLabel = (perm: string) =>
    perm.split('.').slice(1).join(' ').replace(/_/g, ' ');

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
        <Container maxWidth={false} sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0 }}>
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
            <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editRole ? `Edit — ${editRole.name}` : 'New Role'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Role name"
                            value={form.name}
                            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                            size="small"
                            fullWidth
                            autoFocus
                        />

                        {Object.keys(availablePerms).length === 0
                            ? <CircularProgress size={20} />
                            : Object.entries(availablePerms).map(([group, perms]) => (
                                <Box key={group}>
                                    <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                        {group.replace(/_/g, ' ')}
                                    </Typography>
                                    <Stack direction="row" flexWrap="wrap" gap={0}>
                                        {perms.map(perm => (
                                            <FormControlLabel
                                                key={perm}
                                                label={permLabel(perm)}
                                                control={
                                                    <Checkbox
                                                        size="small"
                                                        checked={form.permissions.includes(perm as Permission)}
                                                        onChange={() => handleTogglePerm(perm as Permission)}
                                                    />
                                                }
                                                sx={{ minWidth: 160 }}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            ))
                        }
                    </Stack>
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
