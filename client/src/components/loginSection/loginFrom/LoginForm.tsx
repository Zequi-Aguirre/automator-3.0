import { useContext, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Link,
    TextField,
    Typography,
} from "@mui/material";
import userService from "../../../services/user.service";
import DataContext from "../../../context/DataContext";
import { useNavigate } from "react-router-dom";

const LoginForm = () => {
    const navigate = useNavigate();
    const {
        setLoggedInUser,
        setSession,
        setRole,
        loginRecord,
        setLoginRecord,
    } = useContext(DataContext);

    const [failedResponse, setFailedResponse] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Request access state
    const [showRequest, setShowRequest] = useState(false);
    const [requestForm, setRequestForm] = useState({ name: '', email: '' });
    const [requestError, setRequestError] = useState<string | null>(null);
    const [requestSuccess, setRequestSuccess] = useState(false);
    const [requesting, setRequesting] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const formElement = event.currentTarget;
        const data = new FormData(formElement);

        try {
            const response = await userService.authenticateUser(
                data.get("email") as string,
                data.get("password") as string
            );

            const { access_token, user, role } = response;
            const { id, email, name } = user;

            setSession({
                access_token,
                user: { id, email, name },
            });

            setLoggedInUser(user);
            setRole(role);
            setLoginRecord({ email: "", password: "" });
            setFailedResponse(false);
            navigate(user.must_change_password ? "/change-password" : "/leads");
        } catch (error) {
            setFailedResponse(true);
            console.error("Login failed:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestAccess = async () => {
        setRequestError(null);
        if (!requestForm.name.trim() || !requestForm.email.trim()) {
            setRequestError('Name and email are required.');
            return;
        }
        setRequesting(true);
        try {
            await userService.requestAccount({ name: requestForm.name.trim(), email: requestForm.email.trim() });
            setRequestSuccess(true);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to submit request.';
            setRequestError(msg);
        } finally {
            setRequesting(false);
        }
    };

    if (showRequest) {
        return (
            <Container maxWidth="xs">
                <Box
                    sx={{
                        marginTop: 8,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    <Card sx={{ width: "100%" }}>
                        <CardContent sx={{ p: 3 }}>
                            {requestSuccess
                                ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Alert severity="success">
                                            Your request has been submitted. You'll receive an email once your account is approved.
                                        </Alert>
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            onClick={() => {
                                                setShowRequest(false);
                                                setRequestSuccess(false);
                                                setRequestForm({ name: '', email: '' });
                                            }}
                                        >
                                            Back to Sign In
                                        </Button>
                                    </Box>
                                )
                                : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>Request Access</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Fill in your details and an admin will approve your account.
                                        </Typography>
                                        <TextField
                                            label="Full Name"
                                            size="small"
                                            fullWidth
                                            autoFocus
                                            value={requestForm.name}
                                            onChange={e => { setRequestForm(p => ({ ...p, name: e.target.value })); }}
                                        />
                                        <TextField
                                            label="Email Address"
                                            size="small"
                                            fullWidth
                                            type="email"
                                            value={requestForm.email}
                                            onChange={e => { setRequestForm(p => ({ ...p, email: e.target.value })); }}
                                        />
                                        {requestError && <Alert severity="error">{requestError}</Alert>}
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            disabled={requesting}
                                            onClick={() => { void handleRequestAccess(); }}
                                            sx={{ mt: 1 }}
                                        >
                                            {requesting ? 'Submitting…' : 'Submit Request'}
                                        </Button>
                                        <Link
                                            component="button"
                                            variant="body2"
                                            onClick={() => {
                                                setShowRequest(false);
                                                setRequestError(null);
                                            }}
                                            sx={{ alignSelf: 'center' }}
                                        >
                                            Back to Sign In
                                        </Link>
                                    </Box>
                                )
                            }
                        </CardContent>
                    </Card>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <Card sx={{ width: "100%" }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box
                            component="form"
                            onSubmit={handleSubmit}
                            noValidate
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2
                            }}
                        >
                            <TextField
                                defaultValue={loginRecord.email}
                                required
                                fullWidth
                                id="email"
                                label="Email Address"
                                name="email"
                                autoComplete="email"
                                autoFocus
                                size="small"
                            />

                            <TextField
                                defaultValue={loginRecord.password}
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                autoComplete="current-password"
                                size="small"
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                disabled={isSubmitting}
                                sx={{ mt: 1 }}
                            >
                                {isSubmitting ? "Signing in..." : "Sign In"}
                            </Button>

                            {failedResponse && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    Your credentials were not recognized
                                </Alert>
                            )}
                        </Box>

                        <Box sx={{ textAlign: 'center', mt: 2 }}>
                            <Link
                                component="button"
                                variant="body2"
                                onClick={() => {
                                    setShowRequest(true);
                                    setRequestForm({ name: '', email: '' });
                                    setRequestError(null);
                                }}
                            >
                                Don't have an account? Request access
                            </Link>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default LoginForm;
