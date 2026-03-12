import { Box, Chip, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import {
    ActivityLog, ActivityAction, ACTION_LABELS,
    LeadAction, VerificationAction, WorkerAction, SourceAction,
    BuyerAction, CampaignAction, LeadManagerAction, CountyAction, AuthAction
} from "../../../types/activityTypes";
import { DateTime } from "luxon";

interface Props {
    logs: ActivityLog[];
    loading?: boolean;
}

const actionColor = (action: ActivityAction): "default" | "success" | "error" | "warning" | "info" | "primary" => {
    switch (action) {
        case WorkerAction.STOPPED:
        case LeadAction.UNQUEUED:
        case LeadAction.TRASHED:
        case AuthAction.LOGIN_FAILED:
            return 'error';

        case AuthAction.LOGIN:
            return 'info';

        case WorkerAction.STARTED:
        case LeadAction.QUEUED:
        case LeadAction.VERIFIED:
        case LeadAction.SENT:
        case LeadAction.IMPORTED:
            return 'success';

        case LeadAction.UPDATED:
        case LeadAction.UNVERIFIED:
        case VerificationAction.SAVED:
        case WorkerAction.SETTINGS_UPDATED:
        case SourceAction.UPDATED:
        case BuyerAction.UPDATED:
        case LeadManagerAction.UPDATED:
        case CountyAction.UPDATED:
        case CampaignAction.MANAGER_ASSIGNED:
        case SourceAction.TOKEN_REFRESHED:
            return 'warning';

        case SourceAction.CREATED:
        case BuyerAction.CREATED:
        case LeadManagerAction.CREATED:
        case VerificationAction.STARTED:
            return 'primary';

        default:
            return 'default';
    }
};

const formatDetails = (log: ActivityLog): string | null => {
    if (!log.action_details) return null;
    const d = log.action_details;

    switch (log.action) {
        case LeadAction.IMPORTED: {
            const via = d.method === 'api' && d.source_name ? `via ${d.source_name}` : d.method === 'csv' ? 'via CSV' : '';
            return `${d.count ?? 1} lead${(d.count ?? 1) !== 1 ? 's' : ''} ${via}`.trim();
        }
        case LeadAction.TRASHED: {
            const reason = d.reason ? d.reason.replace(/_/g, ' ') : '';
            const notes = d.notes ? ` · ${d.notes.replace(/_/g, ' ')}` : '';
            return `${reason}${notes}` || null;
        }
        case AuthAction.LOGIN:
        case AuthAction.LOGIN_FAILED: {
            const parts = [];
            if (d.ip) parts.push(d.ip);
            if (d.email) parts.push(`(${d.email})`);
            return parts.join(' ') || null;
        }
        case VerificationAction.SAVED: {
            const fields = Object.keys(d).map(k => k.replace('form_', '').replace(/_/g, ' ')).join(', ');
            return fields || null;
        }
        case LeadAction.SENT:
            return d.buyer_name ? `→ ${d.buyer_name}` : null;
        case SourceAction.CREATED:
        case BuyerAction.CREATED:
        case BuyerAction.UPDATED:
            return d.name ?? null;
        case CampaignAction.MANAGER_ASSIGNED:
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
