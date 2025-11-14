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
    ListItemText
} from "@mui/material";

import { LeadFormInput } from "../../../../types/leadFormInputTypes.ts";
import leadFormInputService from "../../../../services/leadFormInput.service.tsx";

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
    leadId: string;
}

const LeadVerificationForm = ({ leadId }: Props) => {
    const [loading, setLoading] = useState(true);
    const [exists, setExists] = useState(false);
    const [form, setForm] = useState<LeadFormInput | null>(null);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [verifySuccess, setVerifySuccess] = useState<string | null>(null);

    const fetchForm = useCallback(async () => {
        setLoading(true);
        try {
            const response = await leadFormInputService.getByLeadId(leadId);
            if (response) {
                setExists(true);
                setForm(response);
            } else {
                setExists(false);
                setForm(null);
            }
        } catch {
            setExists(false);
            setForm(null);
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    useEffect(() => {
        fetchForm();
    }, [fetchForm]);

    const handleStart = async () => {
        try {
            const emptyPayload = {
                lead_id: leadId,
                form_multifamily: "",
                form_repairs: "",
                form_occupied: "",
                form_sell_fast: "",
                form_goal: "",
                form_owner: "",
                form_owned_years: "",
                form_listed: "",
                form_square: "",
                form_year: "",
                form_garage: "",
                form_bedrooms: "",
                form_bathrooms: ""
            };

            const data = await leadFormInputService.create(emptyPayload);
            setExists(true);
            setForm(data);
        } catch {
            setError("Failed to start verification");
        }
    };

    const handleChange = (field: string, value: any) => {
        if (!form) return;
        setForm({ ...form, [field]: value });
        setDirty(true);
    };

    const handleCancel = () => {
        fetchForm();
        setDirty(false);
        setVerifyError(null);
        setVerifySuccess(null);
    };

    const handleSave = async () => {
        if (!form) return;
        setSaving(true);
        setError(null);
        try {
            const updated = await leadFormInputService.update(leadId, form);
            setForm(updated);
            setDirty(false);
        } catch {
            setError("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleVerify = () => {
        if (!form) return;
        const missing = REQUIRED_FIELDS.filter(
            field => form[field] == null || form[field] === ""
        );

        if (missing.length > 0) {
            setVerifyError("Missing required fields: " + missing.join(", "));
            setVerifySuccess(null);
            return;
        }

        setVerifySuccess("Verification passed. Lead is ready for the queue.");
        setVerifyError(null);
    };

    const isVerifiable = form
        ? REQUIRED_FIELDS.every(field => form[field] && form[field] !== "")
        : false;

    if (loading) {
        return (
            <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Card sx={{ mt: 4 }}>
            <CardHeader title="Lead Verification" />
            <Divider />
            <CardContent>
                {!exists && (
                    <Box sx={{ textAlign: "center", py: 3 }}>
                        <Button variant="contained" onClick={handleStart}>
                            Start Verification
                        </Button>
                    </Box>
                )}

                {exists && form && (
                    <Stack spacing={3}>

                        {/* TYPE OF HOUSE */}
                        <TextField
                            select
                            fullWidth
                            label="Type of house (Required)"
                            value={form.form_multifamily ?? ""}
                            onChange={e => {
                                handleChange("form_multifamily", e.target.value)
                            }}
                        >
                            {TYPE_OF_HOUSE_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>

                        {/* REPAIRS MULTISELECT */}
                        <Select
                            multiple
                            fullWidth
                            displayEmpty
                            value={form.form_repairs ? form.form_repairs.split("\n") : []}
                            onChange={e => {
                                const val = (e.target.value as string[]).join("\n");
                                handleChange("form_repairs", val);
                            }}
                            renderValue={(selected) =>
                                !selected || selected.length === 0
                                    ? "Repairs needed (Required)"
                                    : selected.join(", ")
                            }
                        >
                            {REPAIRS_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>
                                    <Checkbox checked={form.form_repairs?.includes(opt) ?? false} />
                                    <ListItemText primary={opt} />
                                </MenuItem>
                            ))}
                        </Select>

                        {/* SQUARE FOOTAGE */}
                        <TextField
                            select
                            fullWidth
                            label="Square footage"
                            value={form.form_square ?? ""}
                            onChange={e => {
                                handleChange("form_square", e.target.value)
                            }}
                        >
                            {SQUARE_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>

                        {/* YEAR BUILT RANGE */}
                        <TextField
                            select
                            fullWidth
                            label="Year built range"
                            value={form.form_year ?? ""}
                            onChange={e => {
                                handleChange("form_year", e.target.value)
                            }}
                        >
                            {YEAR_RANGE_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>

                        {/* GARAGE */}
                        <TextField
                            select
                            fullWidth
                            label="Garage"
                            value={form.form_garage ?? ""}
                            onChange={e => {
                                handleChange("form_garage", e.target.value)
                            }}
                        >
                            {GARAGE_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>

                        {/* BEDROOMS */}
                        <TextField
                            select
                            fullWidth
                            label="Bedrooms"
                            value={form.form_bedrooms ?? ""}
                            onChange={e => {
                                handleChange("form_bedrooms", e.target.value)
                            }}
                        >
                            {BEDROOM_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>

                        {/* BATHROOMS */}
                        <TextField
                            select
                            fullWidth
                            label="Bathrooms"
                            value={form.form_bathrooms ?? ""}
                            onChange={e => {
                                handleChange("form_bathrooms", e.target.value)
                            }}
                        >
                            {BATHROOM_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>

                        {/* OCCUPIED */}
                        <TextField
                            select
                            fullWidth
                            label="Occupied (Required)"
                            value={form.form_occupied ?? ""}
                            onChange={e => {
                                handleChange("form_occupied", e.target.value)
                            }}
                        >
                            {OCCUPIED_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>

                        {/* SELL FAST */}
                        <TextField
                            select
                            fullWidth
                            label="How fast (Required)"
                            value={form.form_sell_fast ?? ""}
                            onChange={e => {
                                handleChange("form_sell_fast", e.target.value)
                            }}
                        >
                            {SELL_FAST_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>

                        {/* GOAL MULTISELECT */}
                        <Select
                            multiple
                            fullWidth
                            displayEmpty
                            value={form.form_goal ? form.form_goal.split("\n") : []}
                            onChange={e => {
                                const val = (e.target.value as string[]).join("\n");
                                handleChange("form_goal", val);
                            }}
                            renderValue={(selected) =>
                                !selected || selected.length === 0
                                    ? "Goal (Required)"
                                    : selected.join(", ")
                            }
                        >
                            {GOAL_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>
                                    <Checkbox checked={form.form_goal?.includes(opt) ?? false} />
                                    <ListItemText primary={opt} />
                                </MenuItem>
                            ))}
                        </Select>

                        {/* OWNER */}
                        <TextField
                            select
                            fullWidth
                            label="Owner (Required)"
                            value={form.form_owner ?? ""}
                            onChange={e => {
                                handleChange("form_owner", e.target.value)
                            }}
                        >
                            {OWNER_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>

                        {/* OWNED YEARS */}
                        <TextField
                            select
                            fullWidth
                            label="Owned years (Required)"
                            value={form.form_owned_years ?? ""}
                            onChange={e => {
                                handleChange("form_owned_years", e.target.value)
                            }}
                        >
                            {OWNED_YEARS_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>

                        {/* LISTED */}
                        <TextField
                            select
                            fullWidth
                            label="Listed (Required)"
                            value={form.form_listed ?? ""}
                            onChange={e => {
                                handleChange("form_listed", e.target.value)
                            }}
                        >
                            {LISTED_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>

                        {error && <Alert severity="error">{error}</Alert>}
                        {verifyError && <Alert severity="error">{verifyError}</Alert>}
                        {verifySuccess && <Alert severity="success">{verifySuccess}</Alert>}

                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="contained"
                                disabled={!dirty || saving}
                                onClick={handleSave}
                            >
                                Save
                            </Button>

                            <Button
                                variant="outlined"
                                disabled={!dirty}
                                onClick={handleCancel}
                            >
                                Cancel
                            </Button>

                            <Button
                                variant="contained"
                                color="success"
                                disabled={dirty || !isVerifiable}
                                onClick={handleVerify}
                            >
                                Verify
                            </Button>
                        </Stack>

                    </Stack>
                )}
            </CardContent>
        </Card>
    );
};

export default LeadVerificationForm;