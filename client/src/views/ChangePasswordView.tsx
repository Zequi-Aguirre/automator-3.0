import { useContext, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    TextField,
    Typography,
} from "@mui/material";
import userService from "../services/user.service";
import DataContext from "../context/DataContext";
import { useNavigate } from "react-router-dom";

export default function ChangePasswordView() {
    const { loggedInUser, setLoggedInUser } = useContext(DataContext);
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const isForced = loggedInUser?.must_change_password === true;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (newPassword !== confirm) {
            setError("Passwords do not match.");
            return;
        }

        setSubmitting(true);
        try {
            await userService.changePassword(newPassword);
            // Clear must_change_password flag locally
            if (loggedInUser) {
                setLoggedInUser({ ...loggedInUser, must_change_password: false });
            }
            navigate("/leads");
        } catch {
            setError("Failed to change password. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container maxWidth="xs">
            <Box sx={{ mt: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Card sx={{ width: "100%" }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            {isForced ? "Set Your Password" : "Change Password"}
                        </Typography>
                        {isForced && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                You need to set a new password before continuing.
                            </Alert>
                        )}
                        <Box
                            component="form"
                            onSubmit={handleSubmit}
                            noValidate
                            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                        >
                            <TextField
                                label="New Password"
                                type="password"
                                size="small"
                                fullWidth
                                required
                                value={newPassword}
                                onChange={e => { setNewPassword(e.target.value); }}
                                autoFocus
                            />
                            <TextField
                                label="Confirm Password"
                                type="password"
                                size="small"
                                fullWidth
                                required
                                value={confirm}
                                onChange={e => { setConfirm(e.target.value); }}
                            />
                            {error && <Alert severity="error">{error}</Alert>}
                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={submitting}
                                sx={{ mt: 1 }}
                            >
                                {submitting ? "Saving…" : "Set Password"}
                            </Button>
                            {!isForced && (
                                <Button variant="text" onClick={() => { navigate(-1); }}>
                                    Cancel
                                </Button>
                            )}
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
}
