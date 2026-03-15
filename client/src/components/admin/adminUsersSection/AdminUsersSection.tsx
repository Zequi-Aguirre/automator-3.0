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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import userService from '../../../services/user.service';
import roleService from '../../../services/role.service';
import { Permission, User, UserRole } from '../../../types/userTypes';
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
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [availablePerms, setAvailablePerms] = useState<Record<string, string[]>>({});
    const [permDialogUser, setPermDialogUser] = useState<User | null>(null);
    const [selectedPerms, setSelectedPerms] = useState<Permission[]>([]);
    const [roles, setRoles] = useState<PermissionRole[]>([]);
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
                                                                    value={u.permission_role_id ?? ''}
                                                                    size="small"
                                                                    variant="standard"
                                                                    disableUnderline
                                                                    displayEmpty
                                                                    onChange={(e) => { void handleRoleChange(u.id, e.target.value); }}
                                                                    sx={{ fontSize: 'inherit', minWidth: 100 }}
                                                                >
                                                                    {u.permission_role_id === null || u.permission_role_id === undefined ? (
                                                                        <MenuItem value="" disabled>
                                                                            <Typography variant="body2" color="text.disabled">— no role —</Typography>
                                                                        </MenuItem>
                                                                    ) : null}
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
                                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                            <Button
                                                                size="small"
                                                                onClick={() => { navigate(`/users/${u.id}`); }}
                                                            >
                                                                View
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                onClick={() => { handleOpenPermDialog(u); }}
                                                                disabled={isSuperAdmin && !isSelf}
                                                            >
                                                                Edit Permissions
                                                            </Button>
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
                                                    onClick={() => setSelectedPerms(role.permissions)}
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

            <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack}>
                <Alert onClose={closeSnack} severity={snack.severity} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminUsersSection;
