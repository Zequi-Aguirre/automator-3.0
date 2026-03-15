import {
    Box,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import PeopleIcon from "@mui/icons-material/People";
import StoreIcon from "@mui/icons-material/Store";
import SourceIcon from "@mui/icons-material/Source";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import ReceiptIcon from "@mui/icons-material/Receipt";
import TimelineIcon from "@mui/icons-material/Timeline";
import SettingsIcon from "@mui/icons-material/Settings";
import WorkIcon from "@mui/icons-material/Work";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import GroupIcon from "@mui/icons-material/Group";
import LogoutIcon from "@mui/icons-material/Logout";
import { useLocation, useNavigate } from "react-router-dom";
import { useContext, useMemo, useState } from "react";
import userService from "../../services/user.service.tsx";
import DataContext from "../../context/DataContext.tsx";
import { usePermissions } from "../../hooks/usePermissions";
import { Permission } from "../../types/userTypes";

export const SIDEBAR_WIDTH = 220;

type NavItem = {
    label: string;
    icon: React.ReactNode;
    path: string;
    pathMatch: string;
    permission?: Permission;
    adminOnly?: boolean;
};

export default function NavBar() {
    const { setSession, setRole, role, setLoggedInUser } = useContext(DataContext);
    const { can } = usePermissions();
    const navigate = useNavigate();
    const location = useLocation();

    const isMobile = useMediaQuery("(max-width:900px)");
    const [drawerOpen, setDrawerOpen] = useState(false);

    const isAdmin = role.includes("admin");

    const allNavItems: NavItem[] = useMemo(() => [
        { label: "Leads", icon: <PeopleIcon />, path: isAdmin ? "/a/leads" : "/u/leads", pathMatch: "/leads" },
        { label: "Buyers", icon: <StoreIcon />, path: "/a/buyers", pathMatch: "/buyers", permission: Permission.BUYERS_MANAGE },
        { label: "Sources", icon: <SourceIcon />, path: "/a/sources", pathMatch: "/sources", permission: Permission.SOURCES_MANAGE },
        { label: "Lead Managers", icon: <ManageAccountsIcon />, path: "/a/lead-managers", pathMatch: "/lead-managers", permission: Permission.MANAGERS_MANAGE },
        { label: "Counties", icon: <LocationCityIcon />, path: "/a/counties", pathMatch: "/counties", permission: Permission.SETTINGS_MANAGE },
        { label: "Logs", icon: <ReceiptIcon />, path: "/a/logs", pathMatch: "/logs", adminOnly: true },
        { label: "Activity", icon: <TimelineIcon />, path: "/a/activity", pathMatch: "/activity", permission: Permission.ACTIVITY_VIEW },
        { label: "Settings", icon: <SettingsIcon />, path: "/a/settings", pathMatch: "/settings", permission: Permission.SETTINGS_MANAGE },
        { label: "Worker Jobs", icon: <WorkIcon />, path: "/a/worker-jobs", pathMatch: "/worker-jobs", permission: Permission.WORKER_TOGGLE },
        { label: "Roles", icon: <AdminPanelSettingsIcon />, path: "/a/roles", pathMatch: "/roles", permission: Permission.USERS_MANAGE },
        { label: "Users", icon: <GroupIcon />, path: "/a/users", pathMatch: "/users", permission: Permission.USERS_MANAGE },
    ], [isAdmin]);

    const visibleItems = useMemo(() => {
        return allNavItems.filter(item => {
            if (item.adminOnly) return isAdmin;
            if (item.permission) return can(item.permission);
            return true;
        });
    }, [allNavItems, isAdmin, can]);

    const currentPath = location.pathname.toLowerCase();

    const handleNav = (path: string) => {
        navigate(path);
        setDrawerOpen(false);
    };

    const handleLogout = () => {
        userService.signOut();
        setRole("");
        setSession(null);
        setLoggedInUser(null);
        navigate("/login");
        setDrawerOpen(false);
    };

    if (!role) return null;

    const sidebarContent = (
        <Box
            sx={{
                width: SIDEBAR_WIDTH,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                bgcolor: "primary.main",
                color: "white",
            }}
        >
            <Box sx={{ px: 2, py: 1.5 }}>
                <Typography
                    variant="subtitle2"
                    sx={{ color: "white", fontWeight: 700, letterSpacing: 1.5, fontSize: 13 }}
                >
                    AUTOMATOR
                </Typography>
            </Box>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />
            <List sx={{ flexGrow: 1, pt: 1, px: 0.5 }}>
                {visibleItems.map((item) => {
                    const isActive = currentPath.includes(item.pathMatch);
                    return (
                        <ListItemButton
                            key={item.label}
                            onClick={() => handleNav(item.path)}
                            selected={isActive}
                            sx={{
                                color: "white",
                                borderRadius: 1,
                                mb: 0.25,
                                minHeight: 40,
                                "&.Mui-selected": {
                                    bgcolor: "rgba(255,255,255,0.18)",
                                    "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                                },
                                "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                            }}
                        >
                            <ListItemIcon sx={{ color: "white", minWidth: 34 }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{ fontSize: 13, fontWeight: isActive ? 600 : 400 }}
                            />
                        </ListItemButton>
                    );
                })}
            </List>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />
            <List sx={{ px: 0.5, py: 0.5 }}>
                <ListItemButton
                    onClick={handleLogout}
                    sx={{
                        color: "rgba(255,255,255,0.7)",
                        borderRadius: 1,
                        minHeight: 40,
                        "&:hover": { bgcolor: "rgba(255,255,255,0.1)", color: "white" },
                    }}
                >
                    <ListItemIcon sx={{ color: "inherit", minWidth: 34 }}>
                        <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                        primary="Logout"
                        primaryTypographyProps={{ fontSize: 13 }}
                    />
                </ListItemButton>
            </List>
        </Box>
    );

    if (isMobile) {
        return (
            <>
                <Box
                    sx={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 48,
                        bgcolor: "primary.main",
                        display: "flex",
                        alignItems: "center",
                        px: 1.5,
                        zIndex: 1200,
                    }}
                >
                    <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: "white" }}>
                        <MenuIcon />
                    </IconButton>
                    <Typography
                        variant="subtitle2"
                        sx={{ color: "white", fontWeight: 700, letterSpacing: 1.5, fontSize: 13, ml: 1 }}
                    >
                        AUTOMATOR
                    </Typography>
                </Box>
                <Drawer
                    anchor="left"
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                >
                    {sidebarContent}
                </Drawer>
            </>
        );
    }

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: SIDEBAR_WIDTH,
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                    width: SIDEBAR_WIDTH,
                    boxSizing: "border-box",
                    border: "none",
                },
            }}
        >
            {sidebarContent}
        </Drawer>
    );
}
