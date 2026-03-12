import { useContext, useEffect, useState } from 'react';
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
    Typography,
} from '@mui/material';
import userService from '../../../services/user.service';
import { Permission, User, UserRole } from '../../../types/userTypes';
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
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [availablePerms, setAvailablePerms] = useState<Record<string, string[]>>({});
    const [permDialogUser, setPermDialogUser] = useState<User | null>(null);
    const [selectedPerms, setSelectedPerms] = useState<Permission[]>([]);
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

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
    }, []);

    const handleRoleChange = async (userId: string, role: 'user' | 'admin') => {
        try {
            await userService.updateRole(userId, role);
            setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role } : u)));
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

    const closeSnack = () => { setSnack(p => ({ ...p, open: false })); };
    const closePermDialog = () => { setPermDialogUser(null); };

    return (
        <Container maxWidth={false} sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Users</Typography>
                </Box>

                {loading
                    ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                    )
                    : (
                        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                            <TableContainer component={Paper} sx={{ height: '100%' }}>
                                <Table stickyHeader>
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
                                            return (
                                                <TableRow key={u.id} hover>
                                                    <TableCell>
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <span>{u.name}</span>
                                                            {isSelf && (
                                                                <Chip label="you" size="small" variant="outlined" />
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
                                                                    value={u.role}
                                                                    size="small"
                                                                    variant="standard"
                                                                    disableUnderline
                                                                    onChange={(e) => { void handleRoleChange(u.id, e.target.value as 'user' | 'admin'); }}
                                                                    sx={{ fontSize: 'inherit' }}
                                                                >
                                                                    <MenuItem value="user">
                                                                        <Chip label="user" color={ROLE_COLORS.user} size="small" />
                                                                    </MenuItem>
                                                                    <MenuItem value="admin">
                                                                        <Chip label="admin" color={ROLE_COLORS.admin} size="small" />
                                                                    </MenuItem>
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
                                                        <Button
                                                            size="small"
                                                            onClick={() => { handleOpenPermDialog(u); }}
                                                            disabled={isSuperAdmin}
                                                        >
                                                            Edit Permissions
                                                        </Button>
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

            {/* Permissions Dialog */}
            <Dialog open={!!permDialogUser} onClose={closePermDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Edit Permissions — {permDialogUser?.name}
                </DialogTitle>
                <DialogContent>
                    {Object.keys(availablePerms).length === 0
                        ? <CircularProgress size={20} />
                        : (
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                {Object.entries(availablePerms).map(([group, perms]) => (
                                    <Box key={group}>
                                        <Typography
                                            variant="overline"
                                            sx={{ fontWeight: 700, color: 'text.secondary' }}
                                        >
                                            {group.replace(/_/g, ' ')}
                                        </Typography>
                                        <Stack direction="row" flexWrap="wrap" gap={0}>
                                            {perms.map((perm) => (
                                                <FormControlLabel
                                                    key={perm}
                                                    label={permLabel(perm)}
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={selectedPerms.includes(perm as Permission)}
                                                            onChange={() => { handleTogglePerm(perm as Permission); }}
                                                        />
                                                    }
                                                    sx={{ minWidth: 160 }}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                ))}
                            </Stack>
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

            <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack}>
                <Alert onClose={closeSnack} severity={snack.severity} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminUsersSection;
