import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Divider,
    InputAdornment,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { ArrowBack, Visibility, VisibilityOff } from '@mui/icons-material';
import userService from '../../../services/user.service';
import activityService from '../../../services/activity.service';
import { User, UserRole } from '../../../types/userTypes';
import { ActivityLog } from '../../../types/activityTypes';
import ActivityFeed from '../../common/activityFeed/ActivityFeed';

const ROLE_COLORS: Record<UserRole, 'default' | 'primary' | 'warning'> = {
    user: 'default',
    admin: 'primary',
    superadmin: 'warning',
};

const permLabel = (perm: string) =>
    perm.replace(/_/g, ' ').replace('.', ': ');

const AdminUserDetailsSection = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [user, setUser] = useState<User | null>(null);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [activityLoading, setActivityLoading] = useState(true);

    // Reset password (magic link)
    const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    // Admin set password
    const [adminPassword, setAdminPassword] = useState('');
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [setPasswordStatus, setSetPasswordStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (!id) return;

        const loadUser = async () => {
            setLoading(true);
            try {
                const u = await userService.getUserById(id);
                setUser(u);
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        const loadActivity = async () => {
            setActivityLoading(true);
            try {
                const logs = await activityService.getByUser(id);
                setActivityLogs(logs);
            } catch {
                // non-critical
            } finally {
                setActivityLoading(false);
            }
        };

        void loadUser();
        void loadActivity();
    }, [id]);

    const handleResetPassword = async () => {
        if (!id) return;
        setResetStatus('loading');
        try {
            await userService.resetPassword(id);
            setResetStatus('success');
        } catch {
            setResetStatus('error');
        }
    };

    const handleAdminSetPassword = async () => {
        if (!id || adminPassword.length < 6) return;
        setSetPasswordStatus('loading');
        try {
            await userService.adminSetPassword(id, adminPassword);
            setAdminPassword('');
            setSetPasswordStatus('success');
        } catch {
            setSetPasswordStatus('error');
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        return (
            <Container sx={{ p: 4 }}>
                <Alert severity="error">User not found.</Alert>
                <Button startIcon={<ArrowBack />} onClick={() => { navigate('/users'); }} sx={{ mt: 2 }}>
                    Back to Users
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} disableGutters sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Button startIcon={<ArrowBack />} onClick={() => { navigate('/users'); }} variant="outlined" size="small">
                    Users
                </Button>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {user.name}
                </Typography>
                <Chip label={user.role} color={ROLE_COLORS[user.role]} size="small" />
            </Box>

            {/* 2-column body */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Left: Info + Permissions + Password */}
                <Box sx={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: 1, borderColor: 'divider', overflow: 'auto', p: 3, gap: 3 }}>
                    {/* Info card */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Info</Typography>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Email</Typography>
                                <Typography variant="body1">{user.email}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Role</Typography>
                                <Box sx={{ mt: 0.5 }}>
                                    <Chip label={user.role} color={ROLE_COLORS[user.role]} size="small" />
                                </Box>
                            </Box>
                        </Stack>
                    </Paper>

                    {/* Permissions card */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            Permissions
                            <Chip
                                label={`${(user.permissions ?? []).length} granted`}
                                size="small"
                                variant="outlined"
                                sx={{ ml: 1.5 }}
                            />
                        </Typography>
                        {(user.permissions ?? []).length === 0
                            ? <Typography variant="body2" color="text.secondary">No permissions granted.</Typography>
                            : (
                                <Stack direction="row" flexWrap="wrap" gap={1}>
                                    {(user.permissions ?? []).map(perm => (
                                        <Chip key={perm} label={permLabel(perm)} size="small" variant="outlined" />
                                    ))}
                                </Stack>
                            )
                        }
                    </Paper>

                    {/* Password management card */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Password</Typography>

                        {/* Send reset link */}
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Send the user a magic link to set their own password.
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            disabled={resetStatus === 'loading'}
                            onClick={() => { void handleResetPassword(); }}
                        >
                            {resetStatus === 'loading' ? 'Sending…' : 'Send Reset Link'}
                        </Button>
                        {resetStatus === 'success' && (
                            <Alert severity="success" sx={{ mt: 1 }}>Reset link sent.</Alert>
                        )}
                        {resetStatus === 'error' && (
                            <Alert severity="error" sx={{ mt: 1 }}>Failed to send link.</Alert>
                        )}

                        <Divider sx={{ my: 2 }} />

                        {/* Admin set password */}
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Or set their password directly (no email sent).
                        </Typography>
                        <Stack spacing={1}>
                            <TextField
                                label="New Password"
                                type={showAdminPassword ? 'text' : 'password'}
                                size="small"
                                fullWidth
                                value={adminPassword}
                                onChange={e => { setAdminPassword(e.target.value); setSetPasswordStatus('idle'); }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => { setShowAdminPassword(v => !v); }}>
                                                {showAdminPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Button
                                variant="outlined"
                                size="small"
                                disabled={adminPassword.length < 6 || setPasswordStatus === 'loading'}
                                onClick={() => { void handleAdminSetPassword(); }}
                            >
                                {setPasswordStatus === 'loading' ? 'Saving…' : 'Set Password'}
                            </Button>
                            {setPasswordStatus === 'success' && (
                                <Alert severity="success">Password updated.</Alert>
                            )}
                            {setPasswordStatus === 'error' && (
                                <Alert severity="error">Failed to set password.</Alert>
                            )}
                        </Stack>
                    </Paper>
                </Box>

                {/* Right: Activity feed (scrollable) */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                        <Typography variant="subtitle2" fontWeight={700}>Activity</Typography>
                    </Box>
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        <ActivityFeed logs={activityLogs} loading={activityLoading} />
                    </Box>
                </Box>

            </Box>
        </Container>
    );
};

export default AdminUserDetailsSection;
