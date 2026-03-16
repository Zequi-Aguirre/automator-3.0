import { useEffect, useState, useCallback } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    Divider,
    MenuItem,
    Stack,
    TextField,
    Alert,
    Select,
    Checkbox,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Typography
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import { LeadFormInput } from "../../../../types/leadFormInputTypes.ts";
import { Lead } from "../../../../types/leadTypes";
import leadFormInputService from "../../../../services/leadFormInput.service.tsx";
import leadsService from "../../../../services/lead.service";
import { usePermissions } from "../../../../hooks/usePermissions.ts";
import { Permission } from "../../../../types/userTypes.ts";

import {
    TYPE_OF_HOUSE_OPTIONS,
    REPAIRS_OPTIONS,
    OCCUPIED_OPTIONS,
    SELL_FAST_OPTIONS,
    GOAL_OPTIONS,
    OWNER_OPTIONS,
    OWNED_YEARS_OPTIONS,
    LISTED_OPTIONS,
    BEDROOM_OPTIONS,
    BATHROOM_OPTIONS,
    SQUARE_OPTIONS,
    YEAR_RANGE_OPTIONS,
    GARAGE_OPTIONS,
    REQUIRED_FIELDS
} from "./formFieldsAndOptions.ts";

interface Props {
    lead: Lead;
    refreshLead: () => Promise<void> | void;
    refreshActivity?: () => void;
}

const LeadVerificationForm = ({ lead, refreshLead, refreshActivity }: Props) => {
    const { can } = usePermissions();
    const canEdit = can(Permission.LEADS_EDIT) && !lead.verified;
    const canVerify = can(Permission.LEADS_VERIFY);
    const canQueue = can(Permission.LEADS_QUEUE);
    const [loading, setLoading] = useState(true);
    const [exists, setExists] = useState(false);
    const [form, setForm] = useState<LeadFormInput | null>(null);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
    const [askListedModalOpen, setAskListedModalOpen] = useState(false);
    const [confirmTrashModalOpen, setConfirmTrashModalOpen] = useState(false);
    const navigate = useNavigate();
    const isVerified = lead.verified;
    const isLocked = isVerified;

    const fetchForm = useCallback(async () => {
        setLoading(true);
        try {
            const response = await leadFormInputService.getByLeadId(lead.id);
            if (response) {
                setExists(true);
                setForm(response);
                setDirty(false);
                setError(null);
                setVerifyError(null);
                setVerifySuccess(null);
            } else {
                setExists(false);
                setForm(null);
                setDirty(false);
            }
        } catch {
            setExists(false);
            setForm(null);
            setDirty(false);
        } finally {
            setLoading(false);
        }
    }, [lead.id]);

    useEffect(() => {
        fetchForm();
    }, [fetchForm]);

    const handleStart = () => {
        if (isLocked) return;
        const fullAddress = `${lead.address}, ${lead.city}, ${lead.state} ${lead.zipcode}`;
        window.open(`https://www.google.com/search?q=${encodeURIComponent(fullAddress)}`, "_blank");
        setAskListedModalOpen(true);
    };

    const handleListedYes = () => {
        if (isLocked) return;
        setAskListedModalOpen(false);
        setConfirmTrashModalOpen(true);
    };

    const handleListedNo = async () => {
        if (isLocked || saving) return;
        setAskListedModalOpen(false);
        setSaving(true);
        setError(null);
        setVerifyError(null);
        setVerifySuccess(null);
        try {
            if (exists && form) {
                // Form already exists (e.g. API-imported lead) — update the listed field
                const updated = await leadFormInputService.update(lead.id, { ...form, form_listed: LISTED_OPTIONS[1] });
                setForm(updated);
            } else {
                // No form yet — create one with listed pre-filled
                const emptyPayload: LeadFormInput = {
                    lead_id: lead.id,
                    form_multifamily: "",
                    form_repairs: "",
                    form_occupied: "",
                    form_sell_fast: "",
                    form_goal: "",
                    form_owner: "",
                    form_owned_years: "",
                    form_listed: LISTED_OPTIONS[1],
                    form_square: "",
                    form_year: "",
                    form_garage: "",
                    form_bedrooms: "",
                    form_bathrooms: ""
                };
                const data = await leadFormInputService.create(emptyPayload);
                setExists(true);
                setForm(data);
            }
            setDirty(false);
            refreshActivity?.();
        } catch {
            setError("Failed to start verification");
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmTrash = async () => {
        setConfirmTrashModalOpen(false);
        setError(null);
        setVerifyError(null);
        setVerifySuccess(null);
        try {
            await leadsService.trashLead(lead.id, 'Property was listed');
            navigate("/leads");
        } catch {
            setError("Failed to trash lead");
        }
    };

    const handleChange = (field: keyof LeadFormInput, value: unknown) => {
        if (!form || !canEdit || isLocked) return;
        setForm({ ...form, [field]: value });
        setDirty(true);
        setVerifyError(null);
        setVerifySuccess(null);
    };

    const handleCancel = () => {
        if (isLocked) return;
        fetchForm();
        setDirty(false);
        setVerifyError(null);
        setVerifySuccess(null);
    };

    const handleSave = async () => {
        if (!form || isLocked) return;
        setSaving(true);
        setError(null);
        try {
            const updated = await leadFormInputService.update(lead.id, form);
            setForm(updated);
            setDirty(false);
            refreshActivity?.();
        } catch {
            setError("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleVerify = async () => {
        if (!form || isLocked) return;
        const missing = REQUIRED_FIELDS.filter((field) => form[field] == null || form[field] === "");
        if (missing.length > 0) {
            setVerifyError("Missing required fields: " + missing.join(", "));
            setVerifySuccess(null);
            return;
        }
        try {
            setError(null);
            setVerifyError(null);
            await leadsService.verifyLead(lead.id);
            await refreshLead();
            refreshActivity?.();
            setVerifySuccess("Verification passed. Lead is locked and in the queue.");
            setDirty(false);
        } catch {
            setVerifyError("Failed to verify lead");
            setVerifySuccess(null);
        }
    };

    const handleUnverify = async () => {
        if (!form || !isVerified) return;
        try {
            setError(null);
            setVerifyError(null);
            await leadsService.unverifyLead(lead.id);
            await Promise.resolve(refreshLead());
            refreshActivity?.();
            setVerifySuccess("Lead has been unverified and removed from the queue.");
            setDirty(false);
        } catch {
            setVerifyError("Failed to unverify lead");
        }
    };

    const handleQueueToggle = async () => {
        try {
            setError(null);
            if (lead.queued) {
                await leadsService.unqueueLead(lead.id);
            } else {
                await leadsService.queueLead(lead.id);
            }
            await Promise.resolve(refreshLead());
            refreshActivity?.();
        } catch {
            setError("Failed to update queue");
        }
    };

    const isFilled = (field: keyof LeadFormInput): boolean => {
        if (!form) return false;
        const val = form[field];
        if (val == null) return false;
        return val.trim() !== "";
    };

    const isRequired = (field: keyof LeadFormInput): boolean =>
        REQUIRED_FIELDS.includes(field as keyof LeadFormInput);

    // ── Compact row component ────────────────────────────────────────────────
    const FormRow = ({ label: _label, field, children }: {
        label: string;
        field: keyof LeadFormInput;
        children: React.ReactNode;
    }) => {
        const req = isRequired(field);
        const filled = isFilled(field);
        const dotColor = req ? (filled ? '#2e7d32' : '#d32f2f') : 'transparent';
        return (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 38 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {children}
                </Box>
                <Box sx={{ width: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {req && (
                        <>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0 }} />
                            <Typography variant="caption" sx={{ color: dotColor, fontWeight: 700, fontSize: '0.6rem', lineHeight: 1 }}>
                                REQ
                            </Typography>
                        </>
                    )}
                </Box>
            </Stack>
        );
    };

    const isVerifiable = form
        ? REQUIRED_FIELDS.every((field) => form[field] && form[field] !== "")
        : false;

    if (loading) {
        return (
            <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <Card sx={{ mt: 2 }}>
                <CardHeader title="Lead Verification" titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }} />
                <Divider />
                <CardContent sx={{ pt: 1.5 }}>
                    {!isVerified && (
                        <Box sx={{ textAlign: "center", py: 3 }}>
                            <Button
                                variant="contained"
                                onClick={handleStart}
                                disabled={!canEdit || isLocked || saving}
                            >
                                Start Verification
                            </Button>
                        </Box>
                    )}

                    {exists && form && (
                        <Stack spacing={1.5}>

                            {/* ── 2-column compact grid ─────────────────── */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>

                                {/* Listed */}
                                <FormRow label="Listed?" field="form_listed">
                                    <TextField
                                        select size="small" fullWidth label="Listed?"
                                        value={form.form_listed ?? ""}
                                        disabled={!canEdit || isLocked}
                                        onChange={(e) => { handleChange("form_listed", e.target.value); }}
                                    >
                                        {LISTED_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                    </TextField>
                                </FormRow>

                                {/* Type of house */}
                                <FormRow label="Type of house" field="form_multifamily">
                                    <TextField
                                        select size="small" fullWidth label="Type of house"
                                        value={form.form_multifamily ?? ""}
                                        disabled={!canEdit || isLocked}
                                        onChange={(e) => { handleChange("form_multifamily", e.target.value); }}
                                    >
                                        {TYPE_OF_HOUSE_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                    </TextField>
                                </FormRow>

                                {/* Occupied */}
                                <FormRow label="Occupied" field="form_occupied">
                                    <TextField
                                        select size="small" fullWidth label="Occupied"
                                        value={form.form_occupied ?? ""}
                                        disabled={!canEdit || isLocked}
                                        onChange={(e) => { handleChange("form_occupied", e.target.value); }}
                                    >
                                        {OCCUPIED_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                    </TextField>
                                </FormRow>

                                {/* How fast */}
                                <FormRow label="How fast" field="form_sell_fast">
                                    <TextField
                                        select size="small" fullWidth label="How fast to sell"
                                        value={form.form_sell_fast ?? ""}
                                        disabled={!canEdit || isLocked}
                                        onChange={(e) => { handleChange("form_sell_fast", e.target.value); }}
                                    >
                                        {SELL_FAST_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                    </TextField>
                                </FormRow>

                                {/* Owner */}
                                <FormRow label="Owner" field="form_owner">
                                    <TextField
                                        select size="small" fullWidth label="Owner"
                                        value={form.form_owner ?? ""}
                                        disabled={!canEdit || isLocked}
                                        onChange={(e) => { handleChange("form_owner", e.target.value); }}
                                    >
                                        {OWNER_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                    </TextField>
                                </FormRow>

                                {/* Owned years */}
                                <FormRow label="Owned years" field="form_owned_years">
                                    <TextField
                                        select size="small" fullWidth label="Owned years"
                                        value={form.form_owned_years ?? ""}
                                        disabled={!canEdit || isLocked}
                                        onChange={(e) => { handleChange("form_owned_years", e.target.value); }}
                                    >
                                        {OWNED_YEARS_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                    </TextField>
                                </FormRow>

                                {/* Bedrooms */}
                                <FormRow label="Bedrooms" field="form_bedrooms">
                                    <TextField
                                        select size="small" fullWidth label="Bedrooms"
                                        value={form.form_bedrooms ?? ""}
                                        disabled={!canEdit || isLocked}
                                        onChange={(e) => { handleChange("form_bedrooms", e.target.value); }}
                                    >
                                        {BEDROOM_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                    </TextField>
                                </FormRow>

                                {/* Bathrooms */}
                                <FormRow label="Bathrooms" field="form_bathrooms">
                                    <TextField
                                        select size="small" fullWidth label="Bathrooms"
                                        value={form.form_bathrooms ?? ""}
                                        disabled={!canEdit || isLocked}
                                        onChange={(e) => { handleChange("form_bathrooms", e.target.value); }}
                                    >
                                        {BATHROOM_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                    </TextField>
                                </FormRow>

                                {/* Repairs — multiselect, full width */}
                                <Box sx={{ gridColumn: 'span 2' }}>
                                    <FormRow label="Repairs needed" field="form_repairs">
                                        <Select
                                            multiple size="small" fullWidth displayEmpty
                                            disabled={!canEdit || isLocked}
                                            value={form.form_repairs ? form.form_repairs.split("\n") : []}
                                            onChange={(e) => {
                                                handleChange("form_repairs", (e.target.value as string[]).join("\n"));
                                            }}
                                            renderValue={(selected) =>
                                                !selected || selected.length === 0
                                                    ? <Typography variant="body2" color="text.disabled">Repairs needed</Typography>
                                                    : <Typography variant="body2">{(selected).join(", ")}</Typography>
                                            }
                                        >
                                            {REPAIRS_OPTIONS.map((opt) => (
                                                <MenuItem key={opt} value={opt}>
                                                    <Checkbox checked={form.form_repairs?.includes(opt) ?? false} />
                                                    <ListItemText primary={opt} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormRow>
                                </Box>

                                {/* Goal — multiselect, full width */}
                                <Box sx={{ gridColumn: 'span 2' }}>
                                    <FormRow label="Goal" field="form_goal">
                                        <Select
                                            multiple size="small" fullWidth displayEmpty
                                            disabled={!canEdit || isLocked}
                                            value={form.form_goal ? form.form_goal.split("\n") : []}
                                            onChange={(e) => {
                                                handleChange("form_goal", (e.target.value as string[]).join("\n"));
                                            }}
                                            renderValue={(selected) =>
                                                !selected || selected.length === 0
                                                    ? <Typography variant="body2" color="text.disabled">Goal</Typography>
                                                    : <Typography variant="body2">{(selected).join(", ")}</Typography>
                                            }
                                        >
                                            {GOAL_OPTIONS.map((opt) => (
                                                <MenuItem key={opt} value={opt}>
                                                    <Checkbox checked={form.form_goal?.includes(opt) ?? false} />
                                                    <ListItemText primary={opt} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormRow>
                                </Box>

                            </Box>

                            {/* ── Optional fields ───────────────────────── */}
                            <Divider><Typography variant="caption" color="text.disabled">Optional</Typography></Divider>

                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>

                                <FormRow label="Square footage" field="form_square">
                                    <TextField
                                        select size="small" fullWidth label="Square footage"
                                        value={form.form_square ?? ""}
                                        disabled={!canEdit || isLocked}
                                        onChange={(e) => { handleChange("form_square", e.target.value); }}
                                    >
                                        {SQUARE_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                    </TextField>
                                </FormRow>

                                <FormRow label="Year built" field="form_year">
                                    <TextField
                                        select size="small" fullWidth label="Year built range"
                                        value={form.form_year ?? ""}
                                        disabled={!canEdit || isLocked}
                                        onChange={(e) => { handleChange("form_year", e.target.value); }}
                                    >
                                        {YEAR_RANGE_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                    </TextField>
                                </FormRow>

                                <FormRow label="Garage" field="form_garage">
                                    <TextField
                                        select size="small" fullWidth label="Garage"
                                        value={form.form_garage ?? ""}
                                        disabled={!canEdit || isLocked}
                                        onChange={(e) => { handleChange("form_garage", e.target.value); }}
                                    >
                                        {GARAGE_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                    </TextField>
                                </FormRow>

                            </Box>

                            {/* ── Alerts & actions ──────────────────────── */}
                            {error && <Alert severity="error">{error}</Alert>}
                            {verifyError && <Alert severity="error">{verifyError}</Alert>}
                            {verifySuccess && <Alert severity="success">{verifySuccess}</Alert>}

                            {!isLocked && (
                                <Stack direction="row" spacing={2}>
                                    {canEdit && (
                                        <>
                                            <Button variant="contained" disabled={!dirty || saving} onClick={() => { void handleSave(); }}>
                                                Save
                                            </Button>
                                            <Button variant="outlined" disabled={!dirty} onClick={handleCancel}>
                                                Cancel
                                            </Button>
                                        </>
                                    )}
                                    {canVerify && (
                                        <Button
                                            variant="contained" color="success"
                                            disabled={dirty || !isVerifiable}
                                            onClick={() => { void handleVerify(); }}
                                        >
                                            Verify
                                        </Button>
                                    )}
                                    {canQueue && (
                                        <Button
                                            variant={lead.queued ? "contained" : "outlined"}
                                            color={lead.queued ? "error" : "primary"}
                                            onClick={() => { void handleQueueToggle(); }}
                                        >
                                            {lead.queued ? "Remove from Queue" : "Add to Queue"}
                                        </Button>
                                    )}
                                </Stack>
                            )}

                            {isVerified && (
                                <Stack direction="row" spacing={2}>
                                    {canVerify && (
                                        <Button variant="contained" color="warning" onClick={() => { void handleUnverify(); }}>
                                            Unverify
                                        </Button>
                                    )}
                                    {canQueue && (
                                        <Button
                                            variant={lead.queued ? "contained" : "outlined"}
                                            color={lead.queued ? "error" : "primary"}
                                            onClick={() => { void handleQueueToggle(); }}
                                        >
                                            {lead.queued ? "Remove from Queue" : "Add to Queue"}
                                        </Button>
                                    )}
                                </Stack>
                            )}
                        </Stack>
                    )}
                </CardContent>
            </Card>

            {/* ── Is listed? dialog ───────────────────────────────────────── */}
            <Dialog open={askListedModalOpen} onClose={() => { setAskListedModalOpen(false); }}>
                <DialogTitle>Is the property listed?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Before starting verification, confirm whether the property is listed on the market.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleListedYes}>Yes it's listed</Button>
                    <Button onClick={() => { void handleListedNo(); }} disabled={saving}>No it's not listed</Button>
                </DialogActions>
            </Dialog>

            {/* ── Confirm trash dialog ────────────────────────────────────── */}
            <Dialog open={confirmTrashModalOpen} onClose={() => { setConfirmTrashModalOpen(false); }}>
                <DialogTitle>Confirm Trash</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will move the lead to trash. Are you confirming the property is listed?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setConfirmTrashModalOpen(false); }}>Cancel</Button>
                    <Button onClick={() => { void handleConfirmTrash(); }} color="error" variant="contained">Move to Trash</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default LeadVerificationForm;
