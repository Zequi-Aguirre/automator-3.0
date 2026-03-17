import { Box, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

export const ENV_BANNER_HEIGHT = 30;

type EnvConfig = { message: string; bgcolor: string; color: string };

const ENV_CONFIGS: Record<string, EnvConfig> = {
    staging: {
        message: "STAGING — changes here affect real data, not production",
        bgcolor: "#f59e0b",
        color: "#78350f",
    },
    development: {
        message: "LOCAL DEV — safe to break things",
        bgcolor: "#3b82f6",
        color: "#1e3a5f",
    },
};

const appEnv = import.meta.env.VITE_APP_ENV as string | undefined;

export default function EnvBanner() {
    if (appEnv === "production") return null;
    const config = appEnv ? ENV_CONFIGS[appEnv] : undefined;
    if (!config) return null;

    const { message, bgcolor, color } = config;

    return (
        <Box
            sx={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                height: ENV_BANNER_HEIGHT,
                bgcolor,
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
            }}
        >
            <WarningAmberIcon sx={{ fontSize: 16, color }} />
            <Typography
                variant="caption"
                sx={{ fontWeight: 700, color, letterSpacing: 1.5, fontSize: 11 }}
            >
                {message}
            </Typography>
            <WarningAmberIcon sx={{ fontSize: 16, color }} />
        </Box>
    );
}
