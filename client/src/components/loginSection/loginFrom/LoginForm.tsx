import { useContext, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    TextField,
    Alert,
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
            navigate((role === "admin" || role === "superadmin") ? "/a/leads" : "/u/dashboard");
        } catch (error) {
            setFailedResponse(true);
            console.error("Login failed:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

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
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default LoginForm;