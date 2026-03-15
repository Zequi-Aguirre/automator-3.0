import { useContext, useEffect, useState } from 'react';
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
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Stack,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { useNavigate } from 'react-router-dom';
import userService from '../../../services/user.service';
import roleService from '../../../services/role.service';
import { Permission, User, UserCreateDTO, UserRole, UserUpdateDTO } from '../../../types/userTypes';
import { usePermissions } from '../../../hooks/usePermissions';
import { PermissionRole } from '../../../types/roleTypes';
import DataContext from '../../../context/DataContext';

const ROLE_COLORS: Record<UserRole, 'default' | 'primary' | 'warning'> = {
    user: 'default',
    admin: 'primary',
    superadmin: 'warning',
};

const permLabel = (perm: string) =>
    perm.split('.').slice(1).join(' ').replace(/_/g, ' ');

const AdminUsersSection = () => {
    const { loggedInUser } = useContext(DataContext);
    const { can } = usePermissions();
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [availablePerms, setAvailablePerms] = useState<Record<string, string[]>>({});
    const [permDialogUser, setPermDialogUser] = useState<User | null>(null);
    const [selectedPerms, setSelectedPerms] = useState<Permission[]>([]);
    const [roles, setRoles] = useState<PermissionRole[]>([]);
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    // Create user dialog
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState<UserCreateDTO>({ email: '', name: '', role_id: '' });
    const [createError, setCreateError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    // Approve account dialog
    const [approveUser, setApproveUser] = useState<User | null>(null);
    const [approveRoleId, setApproveRoleId] = useState('');
    const [approving, setApproving] = useState(false);

    // Edit user dialog (name/email only)
    const [editUser, setEditUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState<UserUpdateDTO>({});
    const [editError, setEditError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await userService.getAllUsers();
            setUsers(data);
        } catch {
            setSnack({ open: true, message: 'Failed to fetch users', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailablePerms = async () => {
        try {
            const data = await userService.getAvailablePermissions();
            setAvailablePerms(data);
        } catch {
            // non-critical
        }
    };

    useEffect(() => {
        void fetchUsers();
        void fetchAvailablePerms();
        roleService.getAll().then(setRoles).catch(() => {});
    }, []);

    const handleRoleChange = async (userId: string, roleId: string) => {
        try {
            const updated = await userService.assignRole(userId, roleId);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
            setSnack({ open: true, message: 'Role updated', severity: 'success' });
        } catch {
            setSnack({ open: true, message: 'Failed to update role', severity: 'error' });
        }
    };

    const handleOpenPermDialog = (user: User) => {
        setPermDialogUser(user);
        setSelectedPerms(user.permissions ?? []);
    };

    const handleTogglePerm = (perm: Permission) => {
        setSelectedPerms(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        );
    };

    const handleSavePermissions = async () => {
        if (!permDialogUser) return;
        setSaving(true);
        try {
            await userService.setPermissions(permDialogUser.id, selectedPerms);
            setUsers(prev =>
                prev.map(u =>
                    u.id === permDialogUser.id
                        ? { ...u, permissions: selectedPerms }
                        : u
                )
            );
            setSnack({ open: true, message: 'Permissions saved', severity: 'success' });
            setPermDialogUser(null);
        } catch {
            setSnack({ open: true, message: 'Failed to save permissions', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Create user handlers
    const handleOpenCreate = () => {
        setCreateForm({ email: '', name: '', role_id: '' });
        setCreateError(null);
        setCreateOpen(true);
    };

    const handleCreateUser = async () => {
        setCreateError(null);
        if (!createForm.email || !createForm.name || !createForm.role_id) {
            setCreateError('Email, name, and role are required.');
            return;
        }
        setCreating(true);
        try {
            const newUser = await userService.createUser(createForm);
            setUsers(prev => [...prev, newUser]);
            setCreateOpen(false);
            setSnack({ open: true, message: `User "${newUser.name}" created — invite email sent.`, severity: 'success' });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create user';
            setCreateError(msg);
        } finally {
            setCreating(false);
        }
    };

    // Edit user handlers
    const handleOpenEdit = (user: User) => {
        setEditUser(user);
        setEditForm({ name: user.name, email: user.email });
        setEditError(null);
    };

    const handleSaveEdit = async () => {
        if (!editUser) return;
        setEditError(null);
        setEditing(true);
        try {
            const updated = await userService.updateUser(editUser.id, editForm);
            setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...updated } : u));
            setEditUser(null);
            setSnack({ open: true, message: 'User updated', severity: 'success' });
        } catch {
            setEditError('Failed to update user.');
        } finally {
            setEditing(false);
        }
    };

    // Approve account handler
    const handleApproveAccount = async () => {
        if (!approveUser || !approveRoleId) return;
        setApproving(true);
        try {
            const approved = await userService.approveAccount(approveUser.id, approveRoleId);
            setUsers(prev => prev.map(u => u.id === approveUser.id ? { ...u, ...approved } : u));
            setApproveUser(null);
            setApproveRoleId('');
            setSnack({ open: true, message: `Account approved — invite email sent to ${approveUser.email}`, severity: 'success' });
        } catch {
            setSnack({ open: true, message: 'Failed to approve account', severity: 'error' });
        } finally {
            setApproving(false);
        }
    };

    // Deny account handler
    const handleDenyAccount = async (user: User) => {
        try {
            await userService.denyAccount(user.id);
            setUsers(prev => prev.filter(u => u.id !== user.id));
            setSnack({ open: true, message: `Account request from ${user.email} denied`, severity: 'success' });
        } catch {
            setSnack({ open: true, message: 'Failed to deny account', severity: 'error' });
        }
    };

    // Reset password handler
    const handleResetPassword = async (user: User) => {
        try {
            await userService.resetPassword(user.id);
            setSnack({ open: true, message: `Password reset — new credentials sent to ${user.email}`, severity: 'success' });
        } catch {
            setSnack({ open: true, message: 'Failed to reset password', severity: 'error' });
        }
    };

    const closeSnack = () => { setSnack(p => ({ ...p, open: false })); };
    const closePermDialog = () => { setPermDialogUser(null); };

    return (
        <Container maxWidth={false} sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Users</Typography>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<PersonAddIcon />}
                        onClick={handleOpenCreate}
                    >
                        Create User
                    </Button>
                </Box>

                {loading
                    ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                    )
                    : (
                        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                            <TableContainer component={Paper} sx={{ height: '100%' }}>
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Email</TableCell>
                                            <TableCell>Role</TableCell>
                                            <TableCell>Permissions</TableCell>
                                            <TableCell />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {users.map((u) => {
                                            const isSelf = u.id === loggedInUser?.id;
                                            const isSuperAdmin = u.role === 'superadmin';
                                            const isPending = u.status === 'pending';
                                            return (
                                                <TableRow key={u.id} hover sx={isPending ? { opacity: 0.8 } : {}}>
                                                    <TableCell>
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <span>{u.name}</span>
                                                            {isSelf && (
                                                                <Chip label="you" size="small" variant="outlined" />
                                                            )}
                                                            {isPending && (
                                                                <Chip label="pending approval" size="small" color="info" variant="outlined" />
                                                            )}
                                                            {u.must_change_password && !isPending && (
                                                                <Chip label="must change password" size="small" color="warning" variant="outlined" />
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>{u.email}</TableCell>
                                                    <TableCell>
                                                        {isSuperAdmin
                                                            ? (
                                                                <Chip label="superadmin" color={ROLE_COLORS.superadmin} size="small" />
                                                            )
                                                            : (
                                                                <Select
                                                                    value={u.permission_role_id ?? ''}
                                                                    size="small"
                                                                    variant="standard"
                                                                    disableUnderline
                                                                    displayEmpty
                                                                    onChange={(e) => { void handleRoleChange(u.id, e.target.value); }}
                                                                    sx={{ fontSize: 'inherit', minWidth: 100 }}
                                                                >
                                                                    {(u.permission_role_id === null || u.permission_role_id === undefined)
                                                                        ? (
                                                                            <MenuItem value="" disabled>
                                                                                <Typography variant="body2" color="text.disabled">— no role —</Typography>
                                                                            </MenuItem>
                                                                        )
                                                                        : null}
                                                                    {roles.map(r => (
                                                                        <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                                                                    ))}
                                                                </Select>
                                                            )
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={`${(u.permissions ?? []).length} permissions`}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                            {isPending
                                                                ? (
                                                                    <>
                                                                        {can(Permission.USERS_APPROVE) && (
                                                                            <>
                                                                                <Tooltip title="Approve account">
                                                                                    <IconButton
                                                                                        size="small"
                                                                                        color="success"
                                                                                        onClick={() => {
                                                                                            setApproveUser(u);
                                                                                            setApproveRoleId('');
                                                                                        }}
                                                                                    >
                                                                                        <CheckCircleOutlineIcon fontSize="small" />
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                                <Tooltip title="Deny request">
                                                                                    <IconButton
                                                                                        size="small"
                                                                                        color="error"
                                                                                        onClick={() => { void handleDenyAccount(u); }}
                                                                                    >
                                                                                        <CancelOutlinedIcon fontSize="small" />
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                            </>
                                                                        )}
                                                                    </>
                                                                )
                                                                : (
                                                                    <>
                                                                        <Button
                                                                            size="small"
                                                                            onClick={() => { navigate(`/users/${u.id}`); }}
                                                                        >
                                                                            View
                                                                        </Button>
                                                                        <Tooltip title="Edit name / email">
                                                                            <IconButton size="small" onClick={() => { handleOpenEdit(u); }}>
                                                                                <EditIcon fontSize="small" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                        <Tooltip title="Reset password">
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => { void handleResetPassword(u); }}
                                                                                disabled={isSelf}
                                                                            >
                                                                                <LockResetIcon fontSize="small" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                        <Button
                                                                            size="small"
                                                                            onClick={() => { handleOpenPermDialog(u); }}
                                                                            disabled={isSuperAdmin && !isSelf}
                                                                        >
                                                                            Permissions
                                                                        </Button>
                                                                    </>
                                                                )
                                                            }
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {users.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center">No users found</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )
                }
            </Box>

            {/* Create User Dialog */}
            <Dialog open={createOpen} onClose={() => { setCreateOpen(false); }} maxWidth="xs" fullWidth>
                <DialogTitle>Create User</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <TextField
                        label="Name"
                        size="small"
                        fullWidth
                        value={createForm.name}
                        onChange={e => { setCreateForm(p => ({ ...p, name: e.target.value })); }}
                        autoFocus
                    />
                    <TextField
                        label="Email"
                        size="small"
                        fullWidth
                        type="email"
                        value={createForm.email}
                        onChange={e => { setCreateForm(p => ({ ...p, email: e.target.value })); }}
                    />
                    <Select
                        size="small"
                        value={createForm.role_id}
                        onChange={e => { setCreateForm(p => ({ ...p, role_id: e.target.value })); }}
                        fullWidth
                        displayEmpty
                    >
                        <MenuItem value="" disabled>Select a role…</MenuItem>
                        {roles.map(r => (
                            <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                        ))}
                    </Select>
                    {createError && <Alert severity="error">{createError}</Alert>}
                    <Typography variant="caption" color="text.secondary">
                        A temporary password will be generated and emailed to the user.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setCreateOpen(false); }}>Cancel</Button>
                    <Button onClick={() => { void handleCreateUser(); }} variant="contained" disabled={creating}>
                        {creating ? 'Creating…' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={!!editUser} onClose={() => { setEditUser(null); }} maxWidth="xs" fullWidth>
                <DialogTitle>Edit User — {editUser?.name}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <TextField
                        label="Name"
                        size="small"
                        fullWidth
                        value={editForm.name ?? ''}
                        onChange={e => { setEditForm(p => ({ ...p, name: e.target.value })); }}
                        autoFocus
                    />
                    <TextField
                        label="Email"
                        size="small"
                        fullWidth
                        type="email"
                        value={editForm.email ?? ''}
                        onChange={e => { setEditForm(p => ({ ...p, email: e.target.value })); }}
                    />
                    {editError && <Alert severity="error">{editError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setEditUser(null); }}>Cancel</Button>
                    <Button onClick={() => { void handleSaveEdit(); }} variant="contained" disabled={editing}>
                        {editing ? 'Saving…' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Permissions Dialog */}
            <Dialog open={!!permDialogUser} onClose={closePermDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <span>Edit Permissions — {permDialogUser?.name}</span>
                        <Chip
                            label={`${selectedPerms.length} permissions`}
                            size="small"
                            color={selectedPerms.length > 0 ? 'primary' : 'default'}
                            variant="outlined"
                        />
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ maxHeight: 520, p: 0 }}>
                    {Object.keys(availablePerms).length === 0
                        ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24} /></Box>
                        : (
                            <>
                                {roles.length > 0 && (
                                    <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                                        <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                            Apply role template
                                        </Typography>
                                        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
                                            {roles.map(role => (
                                                <Chip
                                                    key={role.id}
                                                    label={role.name}
                                                    size="small"
                                                    variant="outlined"
                                                    clickable
                                                    onClick={() => { setSelectedPerms(role.permissions); }}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                )}
                                {Object.entries(availablePerms).map(([group, perms]) => {
                                    const groupPerms = perms as Permission[];
                                    const selectedInGroup = groupPerms.filter(p => selectedPerms.includes(p)).length;
                                    const allSelected = selectedInGroup === groupPerms.length;
                                    const someSelected = selectedInGroup > 0 && !allSelected;
                                    const toggleGroup = () => {
                                        setSelectedPerms(prev =>
                                            allSelected
                                                ? prev.filter(p => !groupPerms.includes(p))
                                                : [...new Set([...prev, ...groupPerms])]
                                        );
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
                                                        onClick={e => { e.stopPropagation(); }}
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
                                                                    checked={selectedPerms.includes(perm)}
                                                                    onChange={() => { handleTogglePerm(perm); }}
                                                                />
                                                            }
                                                            sx={{ minWidth: 150 }}
                                                        />
                                                    ))}
                                                </Stack>
                                            </AccordionDetails>
                                        </Accordion>
                                    );
                                })}
                            </>
                        )
                    }
                </DialogContent>
                <DialogActions>
                    <Button onClick={closePermDialog}>Cancel</Button>
                    <Button onClick={() => { void handleSavePermissions(); }} variant="contained" disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Approve Account Dialog */}
            <Dialog open={!!approveUser} onClose={() => { setApproveUser(null); }} maxWidth="xs" fullWidth>
                <DialogTitle>Approve Account — {approveUser?.name}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Select a role to assign to <strong>{approveUser?.email}</strong>. A temporary password will be generated and emailed to them.
                    </Typography>
                    <Select
                        size="small"
                        value={approveRoleId}
                        onChange={e => { setApproveRoleId(e.target.value); }}
                        fullWidth
                        displayEmpty
                    >
                        <MenuItem value="" disabled>Select a role…</MenuItem>
                        {roles.map(r => (
                            <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                        ))}
                    </Select>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setApproveUser(null); }}>Cancel</Button>
                    <Button
                        onClick={() => { void handleApproveAccount(); }}
                        variant="contained"
                        color="success"
                        disabled={approving || !approveRoleId}
                    >
                        {approving ? 'Approving…' : 'Approve'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack}>
                <Alert onClose={closeSnack} severity={snack.severity} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminUsersSection;
