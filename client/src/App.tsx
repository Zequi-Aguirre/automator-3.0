import React from 'react';
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Routes, Route } from "react-router-dom";
import { Box } from "@mui/material";
import 'react-toastify/dist/ReactToastify.css';
import LoginPage from "./views/LoginPage";
import AppRoutes from "./context/routes/AppRoutes";
import NavBar from "./components/navBar/NavBar.tsx";

const App: React.FC = () => {
    const theme = createTheme({
        palette: {
            mode: 'light',
            primary: {
                main: '#1976d2',
            },
            background: {
                default: '#f5f5f5',
                paper: '#ffffff',
            },
        },
        components: {
            MuiContainer: {
                styleOverrides: {
                    root: {
                        maxWidth: "2440px",
                        margin: "0 auto",
                        padding: "0 40px",
                        '@media (max-width: 1180px)': {
                            padding: "0 15px",
                        },
                    },
                    maxWidthLg: {
                        maxWidth: '2440px !important',
                    },
                },
            },
        },
    });

    return (
        <ThemeProvider theme={theme}>
            <Box sx={{ display: "flex", minHeight: "100vh" }}>
                <NavBar />
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        overflow: "auto",
                        pt: { xs: "48px", md: 0 },
                    }}
                >
                    <Routes>
                        <Route path="/" element={<LoginPage/>}/>
                        <Route path="/login" element={<LoginPage/>}/>
                    </Routes>
                    <AppRoutes />
                </Box>
            </Box>
        </ThemeProvider>
    );
};

export default App;