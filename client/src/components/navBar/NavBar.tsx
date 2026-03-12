import {
    AppBar,
    Box,
    Button,
    Container,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Toolbar,
    useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useLocation, useNavigate } from "react-router-dom";
import { useContext, useEffect, useMemo, useState } from "react";
import userService from "../../services/user.service.tsx";
import DataContext from "../../context/DataContext.tsx";

const adminPages = [
    "Leads",
    "Buyers",
    "Sources",
    "Lead Managers",
    "Counties",
    "Logs",
    "Activity",
    "Settings",
    "Worker Jobs",
];

const userPages = ["Leads"];

export default function NavBar() {
    const { setSession, setRole, role, setLoggedInUser } = useContext(DataContext);
    const navigate = useNavigate();
    const location = useLocation();

    const isMobile = useMediaQuery("(max-width:900px)");

    const [isAdmin, setIsAdmin] = useState(role.includes("admin"));
    const [currentPage, setCurrentPage] = useState<string>("");
    const [drawerOpen, setDrawerOpen] = useState(false);

    const pages = useMemo(() => {
        return isAdmin ? adminPages : userPages;
    }, [isAdmin]);

    const handleNavItemClick = (page: string) => {
        switch (page) {
            case "Leads":
                if (isAdmin) {
                    navigate("/a/leads");
                } else {
                    navigate("/u/leads");
                }
                break;
            case "Buyers":
                navigate("/a/buyers");
                break;
            case "Sources":
                navigate("/a/sources");
                break;
            case "Lead Managers":
                navigate("/a/lead-managers");
                break;
            case "Counties":
                navigate("/a/counties");
                break;
            case "Logs":
                navigate("/a/logs");
                break;
            case "Activity":
                navigate("/a/activity");
                break;
            case "Settings":
                navigate("/a/settings");
                break;
            case "Worker Jobs":
                navigate("/a/worker-jobs");
                break;
            case "Logout":
                userService.signOut();
                setRole("");
                setSession(null);
                setLoggedInUser(null);
                navigate("/login");
                break;
            default:
            // no-op
        }
    };

    const closeDrawerAndNavigate = (page: string) => {
        handleNavItemClick(page);
        setDrawerOpen(false);
    };

    useEffect(() => {
        const admin = role.includes("admin");
        setIsAdmin(admin);

        const path = location.pathname.toLowerCase();

        switch (true) {
            case path.includes("/leads"):
                setCurrentPage("Leads");
                break;
            case path.includes("/buyers"):
                setCurrentPage("Buyers");
                break;
            case path.includes("/sources"):
                setCurrentPage("Sources");
                break;
            case path.includes("/lead-managers"):
                setCurrentPage("Lead Managers");
                break;
            case path.includes("/counties"):
                setCurrentPage("Counties");
                break;
            case path.includes("/logs"):
                setCurrentPage("Logs");
                break;
            case path.includes("/activity"):
                setCurrentPage("Activity");
                break;
            case path.includes("/settings"):
                setCurrentPage("Settings");
                break;
            case path.includes("/worker-jobs"):
                setCurrentPage("Worker Jobs");
                break;
            default:
                setCurrentPage("");
        }
    }, [location.pathname, role]);

    if (!role) {
        return null;
    }

    return (
        <AppBar position="static" sx={{ height: isMobile ? "3rem" : "4rem", minHeight: "2rem" }}>
            <Container maxWidth={false} disableGutters>
                <Toolbar
                    disableGutters
                    sx={{
                        height: "3rem",
                        minHeight: "3rem",
                        px: 0,
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    {/* Left side */}
                    <Box
                        sx={{
                            ml: 3,
                            display: "flex",
                            alignItems: "center",
                            flexGrow: 1,
                            gap: 0.5,
                            height: "100%",
                        }}
                    >
                        {isMobile
                            ? (
                            <IconButton
                                onClick={() => {
                                    setDrawerOpen(true);
                                }}
                                sx={{
                                    color: "white",
                                }}
                                aria-label="open navigation menu"
                            >
                                <MenuIcon />
                            </IconButton>)
                            : (
                            pages.map((page) => (
                                <Button
                                    key={page}
                                    onClick={() => {
                                        handleNavItemClick(page);
                                    }}
                                    sx={{
                                        color: currentPage === page ? "red" : "white",
                                        fontWeight:
                                            currentPage === page ? "bold" : "normal",
                                    }}
                                >
                                    {page}
                                </Button>
                            ))
                        )}
                    </Box>

                    {/* Right side logout (desktop only) */}
                    <Box sx={{ mr: 3, display: "flex", alignItems: "center" }}>
                        {!isMobile && (
                            <Button
                                onClick={() => {
                                    handleNavItemClick("Logout");
                                }}
                                sx={{ color: "white" }}
                            >
                                Logout
                            </Button>
                        )}
                    </Box>

                    {/* Mobile drawer */}
                    <Drawer
                        anchor="left"
                        open={drawerOpen}
                        onClose={() => {
                            setDrawerOpen(false);
                        }}
                    >
                        <Box
                            sx={{
                                width: 260,
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            {/* Top nav */}
                            <List sx={{ flexGrow: 1 }}>
                                {pages.map((page) => (
                                    <ListItemButton
                                        key={page}
                                        selected={currentPage === page}
                                        onClick={() => {
                                            closeDrawerAndNavigate(page);
                                        }}
                                        sx={{
                                            "&.Mui-selected": {
                                                backgroundColor: "rgba(0,0,0,0.08)",
                                                fontWeight: "bold",
                                            },
                                        }}
                                    >
                                        <ListItemText primary={page} />
                                    </ListItemButton>
                                ))}
                            </List>

                            <Divider />

                            {/* Bottom logout */}
                            <List>
                                <ListItemButton
                                    onClick={() => {
                                        closeDrawerAndNavigate("Logout");
                                    }}
                                >
                                    <ListItemText primary="Logout" />
                                </ListItemButton>
                            </List>
                        </Box>
                    </Drawer>
                </Toolbar>
            </Container>
        </AppBar>
    );
}