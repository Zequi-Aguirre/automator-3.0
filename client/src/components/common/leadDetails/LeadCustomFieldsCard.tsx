// TICKET-152: Displays a lead's custom_fields JSONB with resolved labels from field definitions
import { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    Divider,
    Stack,
    Typography,
} from '@mui/material';
import leadCustomFieldService, { LeadCustomField } from '../../../services/leadCustomField.service';
import { Lead } from '../../../types/leadTypes';

interface Props {
    lead: Lead;
}

export default function LeadCustomFieldsCard({ lead }: Props) {
    const [fieldDefs, setFieldDefs] = useState<LeadCustomField[]>([]);
    const [loading, setLoading] = useState(true);

    const customFields = lead.custom_fields;
    const keys = customFields ? Object.keys(customFields) : [];

    useEffect(() => {
        if (keys.length === 0) {
            setLoading(false);
            return;
        }
        // Fetch all active + inactive defs — we need inactive too for historical data
        leadCustomFieldService.getAll()
            .then(all => { setFieldDefs(all.filter(f => keys.includes(f.key))); })
            .catch(() => { setFieldDefs([]); })
            .finally(() => { setLoading(false); });
    }, [lead.id]);

    if (!customFields || keys.length === 0) return null;

    const getLabel = (key: string): string => {
        const def = fieldDefs.find(f => f.key === key);
        return def ? def.label : key;
    };

    const isDeprecated = (key: string): boolean => {
        const def = fieldDefs.find(f => f.key === key);
        return def ? !def.active : false;
    };

    const formatValue = (key: string, value: unknown): string => {
        if (value === null || value === undefined) return '—';
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
    };

    return (
        <Card square elevation={0} sx={{ flexShrink: 0 }}>
            <CardHeader
                title="Additional Info"
                titleTypographyProps={{ variant: 'subtitle2', fontWeight: 700 }}
                sx={{ pb: 0.5, pt: 1.5, px: 2 }}
            />
            <Divider />
            <CardContent sx={{ pt: 1.5 }}>
                {loading ? (
                    <Box display="flex" justifyContent="center" py={2}>
                        <CircularProgress size={18} />
                    </Box>
                ) : (
                    <Stack spacing={1}>
                        {keys.map(key => (
                            <Box key={key}>
                                <Stack direction="row" alignItems="center" gap={0.75}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                        {getLabel(key)}
                                    </Typography>
                                    {isDeprecated(key) && (
                                        <Chip label="deprecated" size="small" variant="outlined" sx={{ fontSize: 10, height: 16 }} />
                                    )}
                                </Stack>
                                <Typography variant="body2">
                                    {formatValue(key, customFields[key])}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
}
