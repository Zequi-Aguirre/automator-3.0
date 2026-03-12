import { Box, Chip, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import { ActivityLog, ActivityAction, ACTION_LABELS } from "../../../types/activityTypes";
import { DateTime } from "luxon";

interface Props {
    logs: ActivityLog[];
    loading?: boolean;
}

const actionColor = (action: ActivityAction): "default" | "success" | "error" | "warning" | "info" | "primary" => {
    switch (action) {
        case ActivityAction.WORKER_STOPPED:
        case ActivityAction.LEAD_UNQUEUED:
        case ActivityAction.LEAD_TRASHED:
        case ActivityAction.USER_LOGIN_FAILED:
            return 'error';

        case ActivityAction.USER_LOGIN:
            return 'info';

        case ActivityAction.WORKER_STARTED:
        case ActivityAction.LEAD_QUEUED:
        case ActivityAction.LEAD_VERIFIED:
        case ActivityAction.LEAD_SENT:
        case ActivityAction.LEAD_IMPORTED:
            return 'success';

        case ActivityAction.LEAD_UPDATED:
        case ActivityAction.LEAD_UNVERIFIED:
        case ActivityAction.VERIFICATION_SAVED:
        case ActivityAction.WORKER_SETTINGS_UPDATED:
        case ActivityAction.SOURCE_UPDATED:
        case ActivityAction.BUYER_UPDATED:
        case ActivityAction.LEAD_MANAGER_UPDATED:
        case ActivityAction.COUNTY_UPDATED:
        case ActivityAction.CAMPAIGN_MANAGER_ASSIGNED:
        case ActivityAction.SOURCE_TOKEN_REFRESHED:
            return 'warning';

        case ActivityAction.SOURCE_CREATED:
        case ActivityAction.BUYER_CREATED:
        case ActivityAction.LEAD_MANAGER_CREATED:
        case ActivityAction.VERIFICATION_STARTED:
            return 'primary';

        default:
            return 'default';
    }
};

const formatDetails = (log: ActivityLog): string | null => {
    if (!log.action_details) return null;
    const d = log.action_details;

    switch (log.action) {
        case ActivityAction.LEAD_IMPORTED: {
            const via = d.method === 'api' && d.source_name ? `via ${d.source_name}` : d.method === 'csv' ? 'via CSV' : '';
            return `${d.count ?? 1} lead${(d.count ?? 1) !== 1 ? 's' : ''} ${via}`.trim();
        }
        case ActivityAction.LEAD_TRASHED: {
            const reason = d.reason ? d.reason.replace(/_/g, ' ') : '';
            const notes = d.notes ? ` · ${d.notes.replace(/_/g, ' ')}` : '';
            return `${reason}${notes}` || null;
        }
        case ActivityAction.USER_LOGIN:
        case ActivityAction.USER_LOGIN_FAILED: {
            const parts = [];
            if (d.ip) parts.push(d.ip);
            if (d.email) parts.push(`(${d.email})`);
            return parts.join(' ') || null;
        }
        case ActivityAction.VERIFICATION_SAVED: {
            const fields = Object.keys(d).map(k => k.replace('form_', '').replace(/_/g, ' ')).join(', ');
            return fields || null;
        }
        case ActivityAction.LEAD_SENT:
            return d.buyer_name ? `→ ${d.buyer_name}` : null;
        case ActivityAction.SOURCE_CREATED:
        case ActivityAction.BUYER_CREATED:
        case ActivityAction.BUYER_UPDATED:
            return d.name ?? null;
        case ActivityAction.CAMPAIGN_MANAGER_ASSIGNED:
            return d.lead_manager_id ? `manager: ${d.lead_manager_id}` : null;
        default:
            return null;
    }
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
