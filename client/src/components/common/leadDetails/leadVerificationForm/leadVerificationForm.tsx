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
}

const LeadVerificationForm = ({ lead, refreshLead }: Props) => {
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
    const isSent = lead.sent;
    const isLocked = isVerified || isSent;

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
        if (isLocked) {
            return;
        }

        const fullAddress = `${lead.address}, ${lead.city}, ${lead.state} ${lead.zipcode}`;
        const encoded = encodeURIComponent(fullAddress);
        window.open(`https://www.google.com/search?q=${encoded}`, "_blank");

        setAskListedModalOpen(true);
    };

    const handleListedYes = () => {
        if (isLocked) {
            return;
        }
        setAskListedModalOpen(false);
        setConfirmTrashModalOpen(true);
    };

    const handleListedNo = async () => {
        if (isLocked || saving || exists) {
            return;
        }

        setAskListedModalOpen(false);
        setSaving(true);
        setError(null);
        setVerifyError(null);
        setVerifySuccess(null);

        try {
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
            setDirty(false);
            setError(null);
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
            await leadsService.trashLead(lead.id, 'property_was_listed');
            navigate("/a/leads");
        } catch {
            setError("Failed to trash lead");
        }
    };

    const handleChange = (field: keyof LeadFormInput, value: any) => {
        if (!form || isLocked) {
            return;
        }

        setForm({ ...form, [field]: value });
        setDirty(true);
        setVerifyError(null);
        setVerifySuccess(null);
    };

    const handleCancel = () => {
        if (isLocked) {
            return;
        }
        fetchForm();
        setDirty(false);
        setVerifyError(null);
        setVerifySuccess(null);
    };

    const handleSave = async () => {
        if (!form || isLocked) {
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const updated = await leadFormInputService.update(lead.id, form);
            setForm(updated);
            setDirty(false);
        } catch {
            setError("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleVerify = async () => {
        if (!form || isLocked) {
            return;
        }

        const missing = REQUIRED_FIELDS.filter((field) => {
            return form[field] == null || form[field] === "";
        });

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

            setVerifySuccess("Verification passed. Lead is locked and in the queue.");
            setDirty(false);
        } catch {
            setVerifyError("Failed to verify lead");
            setVerifySuccess(null);
        }
    };

    const handleUnverify = async () => {
        if (!form || !isVerified || isSent) {
            return;
        }

        try {
            setError(null);
            setVerifyError(null);

            await leadsService.unverifyLead(lead.id);

            if (typeof refreshLead === "function") {
                await Promise.resolve(refreshLead());
            }

            setVerifySuccess("Lead has been unverifed and removed from the queue.");
            setDirty(false);
        } catch {
            setVerifyError("Failed to unverify lead");
        }
    };

    const isFilled = (field: keyof LeadFormInput): boolean => {
        if (!form) {
            return false;
        }

        const val = form[field];

        if (val == null) {
            return false;
        }

        // Multiselect stores "\n" separated string in your schema
        return val.trim() !== "";
    };

    const isRequired = (field: keyof LeadFormInput): boolean => {
        return REQUIRED_FIELDS.includes(field as any);
    };

    const RequiredHeader = ({ field }: { field: keyof LeadFormInput }) => {
        const required = isRequired(field);
        const filled = isFilled(field);

        if (!required) {
            return null;
        }

        const color = filled ? "success.main" : "error.main";

        return (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Box
                    sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: color,
                        flexShrink: 0
                    }}
                />
                <Typography sx={{ color, fontWeight: 800, fontSize: "0.95rem", letterSpacing: 0.5 }}>
                    REQUIRED
                </Typography>
            </Stack>
        );
    };

    const isVerifiable = form
        ? REQUIRED_FIELDS.every((field) => {
            return form[field] && form[field] !== "";
        })
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
            <Card sx={{ mt: 4 }}>
                <CardHeader title="Lead Verification" />
                <Divider />
                <CardContent>
                    {!exists && (
                        <Box sx={{ textAlign: "center", py: 3 }}>
                            <Button
                                variant="contained"
                                onClick={handleStart}
                                disabled={isLocked || saving}
                            >
                                Start Verification
                            </Button>
                        </Box>
                    )}

                    {exists && form && (
                        <Stack spacing={3}>

                            {/* LISTED FIRST (Required) */}
                            <Box>
                                <RequiredHeader field="form_listed" />
                                <TextField
                                    select
                                    fullWidth
                                    label="Listed?"
                                    value={form.form_listed ?? ""}
                                    disabled={isLocked}
                                    onChange={(e) => {
                                        handleChange("form_listed", e.target.value);
                                    }}
                                >
                                    {LISTED_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            {/* REQUIRED BLOCK */}

                            {/* TYPE OF HOUSE (Required) */}
                            <Box>
                                <RequiredHeader field="form_multifamily" />
                                <TextField
                                    select
                                    fullWidth
                                    label="Type of house"
                                    value={form.form_multifamily ?? ""}
                                    disabled={isLocked}
                                    onChange={(e) => {
                                        handleChange("form_multifamily", e.target.value);
                                    }}
                                >
                                    {TYPE_OF_HOUSE_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            {/* REPAIRS MULTISELECT (Required) */}
                            <Box>
                                <RequiredHeader field="form_repairs" />
                                <Select
                                    multiple
                                    fullWidth
                                    displayEmpty
                                    disabled={isLocked}
                                    value={form.form_repairs ? form.form_repairs.split("\n") : []}
                                    onChange={(e) => {
                                        const val = (e.target.value as string[]).join("\n");
                                        handleChange("form_repairs", val);
                                    }}
                                    renderValue={(selected) =>
                                        !selected || selected.length === 0
                                            ? "Repairs needed"
                                            : (selected).join(", ")
                                    }
                                >
                                    {REPAIRS_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>
                                            <Checkbox checked={form.form_repairs?.includes(opt) ?? false} />
                                            <ListItemText primary={opt} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Box>

                            {/* OCCUPIED (Required) */}
                            <Box>
                                <RequiredHeader field="form_occupied" />
                                <TextField
                                    select
                                    fullWidth
                                    label="Occupied"
                                    value={form.form_occupied ?? ""}
                                    disabled={isLocked}
                                    onChange={(e) => {
                                        handleChange("form_occupied", e.target.value);
                                    }}
                                >
                                    {OCCUPIED_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            {/* SELL FAST (Required) */}
                            <Box>
                                <RequiredHeader field="form_sell_fast" />
                                <TextField
                                    select
                                    fullWidth
                                    label="How fast"
                                    value={form.form_sell_fast ?? ""}
                                    disabled={isLocked}
                                    onChange={(e) => {
                                        handleChange("form_sell_fast", e.target.value);
                                    }}
                                >
                                    {SELL_FAST_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            {/* GOAL MULTISELECT (Required) */}
                            <Box>
                                <RequiredHeader field="form_goal" />
                                <Select
                                    multiple
                                    fullWidth
                                    displayEmpty
                                    disabled={isLocked}
                                    value={form.form_goal ? form.form_goal.split("\n") : []}
                                    onChange={(e) => {
                                        const val = (e.target.value as string[]).join("\n");
                                        handleChange("form_goal", val);
                                    }}
                                    renderValue={(selected) =>
                                        !selected || selected.length === 0
                                            ? "Goal"
                                            : (selected).join(", ")
                                    }
                                >
                                    {GOAL_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>
                                            <Checkbox checked={form.form_goal?.includes(opt) ?? false} />
                                            <ListItemText primary={opt} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Box>

                            {/* OWNER (Required) */}
                            <Box>
                                <RequiredHeader field="form_owner" />
                                <TextField
                                    select
                                    fullWidth
                                    label="Owner"
                                    value={form.form_owner ?? ""}
                                    disabled={isLocked}
                                    onChange={(e) => {
                                        handleChange("form_owner", e.target.value);
                                    }}
                                >
                                    {OWNER_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            {/* OWNED YEARS (Required) */}
                            <Box>
                                <RequiredHeader field="form_owned_years" />
                                <TextField
                                    select
                                    fullWidth
                                    label="Owned years"
                                    value={form.form_owned_years ?? ""}
                                    disabled={isLocked}
                                    onChange={(e) => {
                                        handleChange("form_owned_years", e.target.value);
                                    }}
                                >
                                    {OWNED_YEARS_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            <Box>
                                <RequiredHeader field="form_bedrooms" />
                                <TextField
                                    select
                                    fullWidth
                                    label="Bedrooms"
                                    value={form.form_bedrooms ?? ""}
                                    disabled={isLocked}
                                    onChange={(e) => {
                                        handleChange("form_bedrooms", e.target.value);
                                    }}
                                >
                                    {BEDROOM_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            <Box>
                                <RequiredHeader field="form_bathrooms" />
                                <TextField
                                    select
                                    fullWidth
                                    label="Bathrooms"
                                    value={form.form_bathrooms ?? ""}
                                    disabled={isLocked}
                                    onChange={(e) => {
                                        handleChange("form_bathrooms", e.target.value);
                                    }}
                                >
                                    {BATHROOM_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            {/* OPTIONAL FIELDS */}

                            <TextField
                                select
                                fullWidth
                                label="Square footage"
                                value={form.form_square ?? ""}
                                disabled={isLocked}
                                onChange={(e) => {
                                    handleChange("form_square", e.target.value);
                                }}
                            >
                                {SQUARE_OPTIONS.map((opt) => (
                                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                fullWidth
                                label="Year built range"
                                value={form.form_year ?? ""}
                                disabled={isLocked}
                                onChange={(e) => {
                                    handleChange("form_year", e.target.value);
                                }}
                            >
                                {YEAR_RANGE_OPTIONS.map((opt) => (
                                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                fullWidth
                                label="Garage"
                                value={form.form_garage ?? ""}
                                disabled={isLocked}
                                onChange={(e) => {
                                    handleChange("form_garage", e.target.value);
                                }}
                            >
                                {GARAGE_OPTIONS.map((opt) => (
                                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                ))}
                            </TextField>

                            {error && <Alert severity="error">{error}</Alert>}
                            {verifyError && <Alert severity="error">{verifyError}</Alert>}
                            {verifySuccess && <Alert severity="success">{verifySuccess}</Alert>}

                            {!isLocked && (
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
                            )}

                            {isVerified && !isSent && (
                                <Stack direction="row" spacing={2}>
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        onClick={handleUnverify}
                                    >
                                        Unverify
                                    </Button>
                                </Stack>
                            )}
                        </Stack>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={askListedModalOpen}
                onClose={() => {
                    setAskListedModalOpen(false);
                }}
            >
                <DialogTitle>Is the property listed?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Before starting verification, confirm whether the property is listed on the market.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleListedYes}>
                        Yes it's listed
                    </Button>
                    <Button
                        onClick={handleListedNo}
                        disabled={saving}
                    >
                        No it's not listed
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmTrashModalOpen}
                onClose={() => {
                    setConfirmTrashModalOpen(false);
                }}
            >
                <DialogTitle>Confirm Trash</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will move the lead to trash. Are you confirming the property is listed?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setConfirmTrashModalOpen(false);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmTrash}
                        color="error"
                        variant="contained"
                    >
                        Move to Trash
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default LeadVerificationForm;