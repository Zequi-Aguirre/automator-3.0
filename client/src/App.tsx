import React from 'react';
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Routes, Route } from "react-router-dom";
import 'react-toastify/dist/ReactToastify.css';
import LoginPage from "./views/LoginPage";
import AdminRoutes from "./context/routes/AdminRoutes";
import ProtectedRoutes from "./context/routes/ProtectedRoutes";
import NavBar from "./components/navBar/NavBar.tsx";
import Home from "./views/Home.tsx";

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
                        padding: "0 100px",
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
            <NavBar />
            <Routes>
                <Route path="/" element={<Home/>}/>
                <Route path="/login" element={<LoginPage/>}/>
            </Routes>
            <ProtectedRoutes />
            <AdminRoutes />
        </ThemeProvider>
    );
};

export default App;