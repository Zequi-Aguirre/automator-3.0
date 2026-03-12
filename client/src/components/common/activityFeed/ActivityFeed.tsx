import { Box, Chip, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import { ActivityLog, ACTION_LABELS } from "../../../types/activityTypes";
import { DateTime } from "luxon";

interface Props {
    logs: ActivityLog[];
    loading?: boolean;
}

const actionColor = (action: string): "default" | "success" | "error" | "warning" | "info" | "primary" => {
    if (action === 'worker_stopped' || action === 'lead_unqueued' || action.includes('trashed')) return 'error';
    if (action === 'worker_started' || action === 'lead_queued' || action.includes('verified') || action.includes('sent') || action.includes('imported')) return 'success';
    if (action.includes('updated') || action.includes('assigned') || action === 'worker_settings_updated') return 'warning';
    if (action.includes('created')) return 'primary';
    return 'default';
};

const formatDetails = (log: ActivityLog): string | null => {
    if (!log.action_details) return null;
    const d = log.action_details;
    if (log.action === 'lead_imported') {
        const via = d.method === 'api' && d.source_name ? `via ${d.source_name}` : d.method === 'csv' ? 'via CSV' : '';
        return `${d.count ?? 1} lead${(d.count ?? 1) !== 1 ? 's' : ''} ${via}`.trim();
    }
    if (log.action === 'lead_trashed' && d.reason) {
        const reason = d.reason.replace(/_/g, ' ');
        const notes = d.notes ? ` · ${d.notes.replace(/_/g, ' ')}` : '';
        return `${reason}${notes}`;
    }
    if (log.action === 'lead_sent' && d.buyer_name) return `→ ${d.buyer_name}`;
    if ((log.action === 'source_created' || log.action === 'buyer_created' || log.action === 'buyer_updated') && d.name) return d.name;
    if (log.action === 'campaign_manager_assigned' && d.lead_manager_id) return `manager: ${d.lead_manager_id}`;
    return null;
};

export default function ActivityFeed({ logs, loading }: Props) {
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (logs.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No activity yet.
            </Typography>
        );
    }

    return (
        <Stack divider={<Divider />}>
            {logs.map((log) => {
                const label = ACTION_LABELS[log.action] ?? log.action;
                const details = formatDetails(log);
                const ts = DateTime.fromISO(log.created).toRelative();

                return (
                    <Box key={log.id} sx={{ px: 2, py: 1.5 }}>
                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                            <Chip
                                label={label}
                                size="small"
                                color={actionColor(log.action)}
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                            />
                            {details && (
                                <Typography variant="body2" color="text.secondary">
                                    {details}
                                </Typography>
                            )}
                            <Box sx={{ flexGrow: 1 }} />
                            <Typography variant="caption" color="text.secondary">
                                {log.user_name ?? (log.action_details?.source === 'worker' ? 'Worker' : 'System')}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                                {ts}
                            </Typography>
                        </Stack>
                    </Box>
                );
            })}
        </Stack>
    );
}
