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
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
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
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/a/users')} sx={{ mt: 2 }}>
                    Back to Users
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/a/users')} variant="outlined" size="small">
                    Users
                </Button>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {user.name}
                </Typography>
                <Chip label={user.role} color={ROLE_COLORS[user.role]} size="small" />
            </Box>

            <Stack spacing={3}>
                {/* Info card */}
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Info</Typography>
                    <Stack direction="row" spacing={6}>
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

                {/* Activity card */}
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Activity</Typography>
                    <Divider sx={{ mb: 1 }} />
                    <ActivityFeed logs={activityLogs} loading={activityLoading} />
                </Paper>
            </Stack>
        </Container>
    );
};

export default AdminUserDetailsSection;
