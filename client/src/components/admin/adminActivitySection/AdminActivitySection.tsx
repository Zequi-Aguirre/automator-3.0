import { useCallback, useEffect, useState } from "react";
import {
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
    Typography,
} from "@mui/material";
import activityService from "../../../services/activity.service";
import { ActivityLog, UserActivityStats } from "../../../types/activityTypes";
import ActivityFeed from "../../common/activityFeed/ActivityFeed";

export default function AdminActivitySection() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [stats, setStats] = useState<UserActivityStats[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [recentLogs, userStats] = await Promise.all([
                activityService.getRecent(),
                activityService.getStats(),
            ]);
            setLogs(recentLogs);
            setStats(userStats);
        } catch (err) {
            console.error("Failed to fetch activity", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return (
        <Container
            maxWidth={false}
            sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", p: 0 }}
        >
            <Box sx={{ p: 4, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
                    Activity
                </Typography>

                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={3} sx={{ flexGrow: 1, overflow: "hidden" }}>
                        {/* Recent Feed */}
                        <Grid item xs={12} md={7} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                            <Card sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                                <CardHeader title="Recent Activity" titleTypographyProps={{ variant: "h6" }} />
                                <Divider />
                                <CardContent sx={{ flexGrow: 1, overflow: "auto", p: 0 }}>
                                    <ActivityFeed logs={logs} />
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* User Stats */}
                        <Grid item xs={12} md={5} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                            <Card sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                                <CardHeader title="User Stats" titleTypographyProps={{ variant: "h6" }} />
                                <Divider />
                                <CardContent sx={{ flexGrow: 1, overflow: "auto", p: 0 }}>
                                    <TableContainer component={Paper} elevation={0} sx={{ height: "100%" }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>User</TableCell>
                                                    <TableCell align="right">Today</TableCell>
                                                    <TableCell align="right">7 days</TableCell>
                                                    <TableCell align="right">30 days</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {stats.map((row) => (
                                                    <TableRow key={row.user_id} hover>
                                                        <TableCell>{row.user_name}</TableCell>
                                                        <TableCell align="right">{row.today}</TableCell>
                                                        <TableCell align="right">{row.week}</TableCell>
                                                        <TableCell align="right">{row.month}</TableCell>
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
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}
            </Box>
        </Container>
    );
}
