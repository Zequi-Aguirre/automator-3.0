import { useState } from 'react';
import {
    Box,
    Checkbox,
    Chip,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import { BuyerCreateDTO, BuyerUpdateDTO } from '../../../types/buyerTypes';
import { US_STATES } from '../../../constants/usStates';

type BuyerFormData = BuyerCreateDTO | BuyerUpdateDTO;

const detectAuthPreset = (
    headerName: string,
    prefix: string | null
): 'bearer' | 'apikey' | 'custom' => {
    if (headerName === 'Authorization' && prefix === 'Bearer') return 'bearer';
    if (!prefix) return 'apikey';
    return 'custom';
};

interface BuyerFormFieldsProps {
    formData: BuyerFormData;
    onChange: (data: BuyerFormData) => void;
    /** True when editing an existing buyer (shows "leave empty to keep token" hint) */
    isEditing?: boolean;
    /** True when the buyer already has a stored auth token in the DB */
    hasStoredToken?: boolean;
}

/**
 * Shared buyer edit form fields.
 * Used in both the table create/edit dialog (AdminBuyersSection) and the
 * buyer details page (AdminBuyerDetailsView) so both surfaces are always in sync.
 *
 * Mount with a changing `key` prop whenever the target buyer changes so that
 * internal presentation state (auth preset, states toggle) re-initialises.
 */
const BuyerFormFields = ({
    formData,
    onChange,
    isEditing = false,
    hasStoredToken = false,
}: BuyerFormFieldsProps) => {
    const fd = formData as any;

    const [showStates, setShowStates] = useState(
        () => (fd.states_on_hold?.length ?? 0) > 0
    );
    const [requiresAuth, setRequiresAuth] = useState(
        () => !!(hasStoredToken || fd.auth_header_prefix || fd.auth_header_name !== 'Authorization')
    );
    const [authPreset, setAuthPreset] = useState<'bearer' | 'apikey' | 'custom'>(
        () => detectAuthPreset(fd.auth_header_name || 'Authorization', fd.auth_header_prefix ?? null)
    );

    const u = (updates: Record<string, unknown>) => {
        onChange({ ...formData, ...updates } as BuyerFormData);
    };

    return (
        <Stack spacing={2}>
            {/* Name + Priority */}
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                    size="small"
                    fullWidth
                    label="Name"
                    value={fd.name || ''}
                    onChange={(e) => { u({ name: e.target.value }); }}
                />
                <TextField
                    size="small"
                    sx={{ width: 120 }}
                    label="Priority"
                    type="number"
                    value={fd.priority ?? ''}
                    onChange={(e) => { u({ priority: parseInt(e.target.value) }); }}
                />
            </Box>

            {/* Webhook URL */}
            <TextField
                size="small"
                fullWidth
                label="Webhook URL"
                value={fd.webhook_url || ''}
                onChange={(e) => { u({ webhook_url: e.target.value }); }}
            />

            {/* Dispatch Mode */}
            <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Dispatch Mode
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <FormControlLabel
                        control={<Checkbox size="small" checked={!!fd.auto_send} onChange={(e) => { u({ auto_send: e.target.checked }); }} />}
                        label={<Typography variant="body2">Auto Send</Typography>}
                    />
                    <FormControlLabel
                        control={<Checkbox size="small" checked={fd.manual_send !== false} onChange={(e) => { u({ manual_send: e.target.checked }); }} />}
                        label={<Typography variant="body2">Manual</Typography>}
                    />
                    <FormControlLabel
                        control={<Checkbox size="small" checked={fd.worker_send !== false} onChange={(e) => { u({ worker_send: e.target.checked }); }} />}
                        label={<Typography variant="body2">Worker</Typography>}
                    />
                </Box>
            </Box>

            {/* Payload Format */}
            <FormControl size="small" fullWidth>
                <InputLabel>Payload Format</InputLabel>
                <Select
                    value={fd.payload_format ?? 'default'}
                    label="Payload Format"
                    onChange={(e) => { u({ payload_format: e.target.value }); }}
                >
                    <MenuItem value="default">Default</MenuItem>
                    <MenuItem value="northstar">Northstar (Compass / SellersDirect)</MenuItem>
                    <MenuItem value="ispeedtolead">iSpeedToLead</MenuItem>
                </Select>
            </FormControl>

            {/* Payload Extras */}
            <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Payload Extras
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <FormControlLabel
                        control={<Switch size="small" checked={!!fd.send_lead_id} onChange={(e) => { u({ send_lead_id: e.target.checked }); }} />}
                        label={
                            <Typography variant="body2">
                                Send Internal Lead ID{' '}
                                <Typography component="span" variant="caption" color="text.secondary">
                                    (for dispute matching)
                                </Typography>
                            </Typography>
                        }
                    />
                    <FormControlLabel
                        control={<Switch size="small" checked={!!fd.send_private_note} onChange={(e) => { u({ send_private_note: e.target.checked }); }} />}
                        label={
                            <Typography variant="body2">
                                Send Private Note{' '}
                                <Typography component="span" variant="caption" color="text.secondary">
                                    (MMDD-HHmm Platform - Campaign)
                                </Typography>
                            </Typography>
                        }
                    />
                </Box>
            </Box>

            {/* Send Interval */}
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                    size="small"
                    fullWidth
                    label="Min Min Between Sends"
                    type="number"
                    value={fd.min_minutes_between_sends ?? 4}
                    onChange={(e) => { u({ min_minutes_between_sends: parseInt(e.target.value) }); }}
                />
                <TextField
                    size="small"
                    fullWidth
                    label="Max Min Between Sends"
                    type="number"
                    value={fd.max_minutes_between_sends ?? 11}
                    onChange={(e) => { u({ max_minutes_between_sends: parseInt(e.target.value) }); }}
                />
            </Box>

            {/* Flags */}
            <FormControlLabel
                control={<Switch size="small" checked={!!fd.allow_resell} onChange={(e) => { u({ allow_resell: e.target.checked }); }} />}
                label={<Typography variant="body2">Allow Resell</Typography>}
            />
            <FormControlLabel
                control={<Switch size="small" checked={!!fd.requires_validation} onChange={(e) => { u({ requires_validation: e.target.checked }); }} />}
                label={<Typography variant="body2">Requires Validation</Typography>}
            />

            {/* States on Hold */}
            <Box>
                <FormControlLabel
                    control={
                        <Switch
                            size="small"
                            checked={showStates}
                            onChange={(e) => {
                                setShowStates(e.target.checked);
                                if (!e.target.checked) { u({ states_on_hold: [] }); }
                            }}
                        />
                    }
                    label={
                        <Typography variant="body2">
                            States on Hold{' '}
                            {(fd.states_on_hold?.length ?? 0) > 0 && (
                                <Chip
                                    label={fd.states_on_hold.length}
                                    size="small"
                                    sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }}
                                />
                            )}
                        </Typography>
                    }
                />
                {showStates && (
                    <TextField
                        select
                        size="small"
                        fullWidth
                        label="States on Hold"
                        SelectProps={{ multiple: true, value: fd.states_on_hold || [] }}
                        onChange={(e) => { u({ states_on_hold: e.target.value as unknown as string[] }); }}
                        sx={{ mt: 1 }}
                    >
                        {US_STATES.map((s) => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                    </TextField>
                )}
            </Box>

            {/* County Cooldown */}
            <FormControlLabel
                control={<Switch size="small" checked={!!fd.enforce_county_cooldown} onChange={(e) => { u({ enforce_county_cooldown: e.target.checked }); }} />}
                label={<Typography variant="body2">Enforce County Cooldown</Typography>}
            />
            {fd.enforce_county_cooldown && (
                <TextField
                    size="small"
                    fullWidth
                    label="County Cooldown (hours)"
                    type="number"
                    value={fd.delay_same_county ?? 36}
                    onChange={(e) => { u({ delay_same_county: parseInt(e.target.value) }); }}
                />
            )}

            {/* State Cooldown */}
            <FormControlLabel
                control={<Switch size="small" checked={!!fd.enforce_state_cooldown} onChange={(e) => { u({ enforce_state_cooldown: e.target.checked }); }} />}
                label={<Typography variant="body2">Enforce State Cooldown</Typography>}
            />
            {fd.enforce_state_cooldown && (
                <TextField
                    size="small"
                    fullWidth
                    label="State Cooldown (hours)"
                    type="number"
                    value={fd.delay_same_state ?? 0}
                    onChange={(e) => { u({ delay_same_state: parseInt(e.target.value) }); }}
                />
            )}

            {/* Authentication */}
            <FormControlLabel
                control={
                    <Switch
                        size="small"
                        checked={requiresAuth}
                        onChange={(e) => {
                            setRequiresAuth(e.target.checked);
                            if (!e.target.checked) {
                                setAuthPreset('bearer');
                                u({ auth_header_name: 'Authorization', auth_header_prefix: null, auth_token: null });
                            } else {
                                setAuthPreset('bearer');
                                u({ auth_header_name: 'Authorization', auth_header_prefix: 'Bearer' });
                            }
                        }}
                    />
                }
                label={<Typography variant="body2">Requires Authentication</Typography>}
            />
            {requiresAuth && (
                <>
                    <FormControl size="small" fullWidth>
                        <InputLabel>Auth Preset</InputLabel>
                        <Select
                            value={authPreset}
                            label="Auth Preset"
                            onChange={(e) => {
                                const preset = e.target.value as 'bearer' | 'apikey' | 'custom';
                                setAuthPreset(preset);
                                if (preset === 'bearer') {
                                    u({ auth_header_name: 'Authorization', auth_header_prefix: 'Bearer' });
                                } else if (preset === 'apikey') {
                                    u({ auth_header_name: 'X-Api-Key', auth_header_prefix: null });
                                }
                            }}
                        >
                            <MenuItem value="bearer">Bearer Token</MenuItem>
                            <MenuItem value="apikey">API Key</MenuItem>
                            <MenuItem value="custom">Custom</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        size="small"
                        fullWidth
                        label="Header Name"
                        value={fd.auth_header_name || ''}
                        onChange={(e) => {
                            setAuthPreset('custom');
                            u({ auth_header_name: e.target.value });
                        }}
                    />
                    {authPreset !== 'apikey' && (
                        <TextField
                            size="small"
                            fullWidth
                            label="Header Prefix"
                            value={fd.auth_header_prefix || ''}
                            onChange={(e) => {
                                setAuthPreset('custom');
                                u({ auth_header_prefix: e.target.value || null });
                            }}
                        />
                    )}
                    <TextField
                        size="small"
                        fullWidth
                        label="Auth Token"
                        type="password"
                        value={fd.auth_token || ''}
                        onChange={(e) => { u({ auth_token: e.target.value || null }); }}
                        helperText={isEditing ? 'Leave empty to keep current token' : ''}
                    />
                </>
            )}
        </Stack>
    );
};

export default BuyerFormFields;
