import { useLocation } from "react-router-dom";
import DataContext from "../context/DataContext.tsx";
import { useContext, useEffect, useRef, useState } from "react";
import LoginForm from "../components/loginSection/loginFrom/LoginForm.tsx";
import ImportLeadsDialog from "../components/common/leadsSection/importLeadsDialog/importLeadsDialog.tsx";
import { Box, Button, Stack } from "@mui/material";

type ImportStatus = "idle" | "success" | "error";

const StatusDots = ({ status }: { status: ImportStatus }) => {
    const baseDot = {
        width: 12,
        height: 12,
        borderRadius: "50%",
        opacity: 0.35,
        transition: "all 0.2s ease",
    };

    const greenActive = status === "success";
    const redActive = status === "error";

    return (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box
                sx={{
                    ...baseDot,
                    backgroundColor: greenActive ? "success.main" : "success.light",
                    opacity: greenActive ? 1 : baseDot.opacity,
                    boxShadow: greenActive ? "0 0 6px rgba(0,0,0,0.2)" : "none",
                }}
            />
            <Box
                sx={{
                    ...baseDot,
                    backgroundColor: redActive ? "error.main" : "error.light",
                    opacity: redActive ? 1 : baseDot.opacity,
                    boxShadow: redActive ? "0 0 6px rgba(0,0,0,0.2)" : "none",
                }}
            />
        </Stack>
    );
};

export default function LoginPage() {
    const location = useLocation();
    const { setSession, setRole } = useContext(DataContext);

    const [importOpen, setImportOpen] = useState(false);
    const [importStatus, setImportStatus] = useState<ImportStatus>("idle");

    // track whether dialog actually succeeded before closing
    const importSucceededRef = useRef(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const sessionExpired = searchParams.get("sessionExpired");
        if (sessionExpired === "true") {
            setSession(null);
            setRole("");
        }
    }, [location.search, setSession, setRole]);

    const handleImportOpen = () => {
        importSucceededRef.current = false;
        setImportStatus("idle");
        setImportOpen(true);
    };

    const handleImportClose = () => {
        setImportOpen(false);

        // if they opened it and closed without success, mark as error
        if (!importSucceededRef.current) {
            setImportStatus("error");
        }

        importSucceededRef.current = false;
    };

    const handleImportSuccess = (summary: { imported?: number; rejected?: number }) => {
        // you said keep it simple. so: green light.
        importSucceededRef.current = true;
        setImportStatus("success");
        setImportOpen(false);
    };

    return (
        <>
            <LoginForm />

            {/* Import CTA + status dots */}
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    <Button
                        variant="outlined"
                        onClick={handleImportOpen}
                    >
                        Import leads
                    </Button>

                    <StatusDots status={importStatus} />
                </Stack>
            </Box>

            <ImportLeadsDialog
                open={importOpen}
                onClose={handleImportClose}
                onSuccess={handleImportSuccess}
            />
        </>
    );
}