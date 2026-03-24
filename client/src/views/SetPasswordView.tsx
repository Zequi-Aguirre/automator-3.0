import { useState } from "react";
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
import { useNavigate, useSearchParams } from "react-router-dom";
import userService from "../services/user.service";

export default function SetPasswordView() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") ?? "";

    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    if (!token) {
        return (
            <Container maxWidth="xs">
                <Box sx={{ mt: 8 }}>
                    <Alert severity="error">
                        Invalid or missing reset link. Please request a new one.
                    </Alert>
                </Box>
            </Container>
        );
    }

    if (done) {
        return (
            <Container maxWidth="xs">
                <Box sx={{ mt: 8 }}>
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Your password has been set. You can now sign in.
                    </Alert>
                    <Button fullWidth variant="contained" onClick={() => { navigate("/login"); }}>
                        Go to Sign In
                    </Button>
                </Box>
            </Container>
        );
    }

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
            await userService.setPasswordWithToken(token, newPassword);
            setDone(true);
        } catch {
            setError("This link is invalid or has expired. Please request a new password reset.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container maxWidth="xs">
            <Box sx={{ mt: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Card sx={{ width: "100%" }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                            Set Your Password
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Choose a password for your Automator account.
                        </Typography>
                        <Box
                            component="form"
                            onSubmit={(e) => { void handleSubmit(e); }}
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
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
}
