import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Box,
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    Container,
    Divider,
    Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import activityService from "../../../services/activity.service";
import { ActivityLog, UserActivityStats } from "../../../types/activityTypes";
import ActivityFeed from "../../common/activityFeed/ActivityFeed";

const DAY_OPTIONS = [
    { label: "Today", value: 1 },
    { label: "7 days", value: 7 },
    { label: "30 days", value: 30 },
    { label: "90 days", value: 90 },
];

export default function AdminActivitySection() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [stats, setStats] = useState<UserActivityStats[]>([]);
    const [loadingFeed, setLoadingFeed] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);
    const [feedError, setFeedError] = useState<string | null>(null);
    const [days, setDays] = useState(30);

    const fetchFeed = useCallback(async () => {
        setLoadingFeed(true);
        setFeedError(null);
        try {
            setLogs(await activityService.getRecent());
        } catch (err) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            const msg = e.response?.data?.message ?? e.message ?? 'Unknown error';
            setFeedError(msg);
            console.error("Failed to fetch activity feed", err);
        } finally {
            setLoadingFeed(false);
        }
    }, []);

    const fetchStats = useCallback(async (d: number) => {
        setLoadingStats(true);
        try {
            setStats(await activityService.getStats(d));
        } catch (err) {
            console.error("Failed to fetch activity stats", err);
        } finally {
            setLoadingStats(false);
        }
    }, []);

    useEffect(() => { fetchFeed(); }, [fetchFeed]);
    useEffect(() => { fetchStats(days); }, [fetchStats, days]);

    return (
        <Container
            maxWidth={false}
            sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", p: 0 }}
        >
            <Box sx={{ p: 4, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
                    Activity
                </Typography>

                <Grid container spacing={3} sx={{ flexGrow: 1, overflow: "hidden" }}>
                    {/* Recent Feed */}
                    <Grid item xs={12} md={7} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                        <Card sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                            <CardHeader title="Recent Activity" titleTypographyProps={{ variant: "h6" }} />
                            <Divider />
                            <CardContent sx={{ flexGrow: 1, overflow: "auto", p: 0 }}>
                                {feedError
                                    ? (
                                        <Box sx={{ p: 2 }}>
                                            <Alert severity="error">Failed to load activity: {feedError}</Alert>
                                        </Box>
                                    )
                                    : (
                                        <ActivityFeed logs={logs} loading={loadingFeed} />
                                    )
                                }
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* User Stats */}
                    <Grid item xs={12} md={5} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                        <Card sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                            <CardHeader
                                title="User Stats"
                                titleTypographyProps={{ variant: "h6" }}
                                action={
                                    <ToggleButtonGroup
                                        value={days}
                                        exclusive
                                        size="small"
                                        onChange={(_e, val) => { if (val !== null) setDays(val); }}
                                    >
                                        {DAY_OPTIONS.map(o => (
                                            <ToggleButton key={o.value} value={o.value} sx={{ px: 1.5 }}>
                                                {o.label}
                                            </ToggleButton>
                                        ))}
                                    </ToggleButtonGroup>
                                }
                            />
                            <Divider />
                            <CardContent sx={{ flexGrow: 1, overflow: "auto", p: 0 }}>
                                {loadingStats ? (
                                    <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                                        <CircularProgress size={24} />
                                    </Box>
                                ) : (
                                    <TableContainer component={Paper} elevation={0} sx={{ height: "100%" }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>User</TableCell>
                                                    <TableCell align="right">Verified</TableCell>
                                                    <TableCell align="right">Sent</TableCell>
                                                    <TableCell align="right">Deleted</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {stats.map(row => (
                                                    <TableRow key={row.user_id} hover>
                                                        <TableCell>{row.user_name}</TableCell>
                                                        <TableCell align="right">{row.verified}</TableCell>
                                                        <TableCell align="right">{row.sent}</TableCell>
                                                        <TableCell align="right">{row.deleted}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {stats.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} align="center">
                                                            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                                                No data
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </Container>
    );
}
