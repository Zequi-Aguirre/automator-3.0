import {
    Box,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
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

export const SIDEBAR_EXPANDED = 253;
export const SIDEBAR_COLLAPSED = 60;

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
    const theme = useTheme();

    const isMobile = useMediaQuery("(max-width:900px)");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

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

    const sidebarContent = (isCollapsed: boolean) => (
        <Box
            sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                bgcolor: "primary.main",
                color: "white",
                overflowX: "hidden",
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isCollapsed ? "center" : "space-between",
                    px: isCollapsed ? 0 : 2,
                    py: 1.5,
                    minHeight: 48,
                }}
            >
                {!isCollapsed && (
                    <Typography
                        variant="subtitle2"
                        sx={{ color: "white", fontWeight: 700, letterSpacing: 1.5, fontSize: 13, whiteSpace: "nowrap" }}
                    >
                        AUTOMATOR
                    </Typography>
                )}
                <Tooltip title={isCollapsed ? "Expand" : "Collapse"} placement="right">
                    <IconButton
                        onClick={() => setCollapsed(v => !v)}
                        size="small"
                        sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "white" } }}
                    >
                        {isCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
                    </IconButton>
                </Tooltip>
            </Box>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />

            {/* Nav items */}
            <List sx={{ flexGrow: 1, pt: 1, px: isCollapsed ? 0.5 : 0.5 }}>
                {visibleItems.map((item) => {
                    const isActive = currentPath.includes(item.pathMatch);
                    return (
                        <Tooltip
                            key={item.label}
                            title={isCollapsed ? item.label : ""}
                            placement="right"
                            arrow
                        >
                            <ListItemButton
                                onClick={() => handleNav(item.path)}
                                selected={isActive}
                                sx={{
                                    color: "white",
                                    borderRadius: 1,
                                    mb: 0.25,
                                    minHeight: 40,
                                    justifyContent: isCollapsed ? "center" : "flex-start",
                                    px: isCollapsed ? 1.5 : 1,
                                    "&.Mui-selected": {
                                        bgcolor: "rgba(255,255,255,0.18)",
                                        "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                                    },
                                    "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        color: "white",
                                        minWidth: isCollapsed ? 0 : 34,
                                        mr: isCollapsed ? 0 : 0,
                                        justifyContent: "center",
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                {!isCollapsed && (
                                    <ListItemText
                                        primary={item.label}
                                        primaryTypographyProps={{ fontSize: 13, fontWeight: isActive ? 600 : 400, noWrap: true }}
                                    />
                                )}
                            </ListItemButton>
                        </Tooltip>
                    );
                })}
            </List>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />

            {/* Logout */}
            <List sx={{ px: 0.5, py: 0.5 }}>
                <Tooltip title={isCollapsed ? "Logout" : ""} placement="right" arrow>
                    <ListItemButton
                        onClick={handleLogout}
                        sx={{
                            color: "rgba(255,255,255,0.7)",
                            borderRadius: 1,
                            minHeight: 40,
                            justifyContent: isCollapsed ? "center" : "flex-start",
                            px: isCollapsed ? 1.5 : 1,
                            "&:hover": { bgcolor: "rgba(255,255,255,0.1)", color: "white" },
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                color: "inherit",
                                minWidth: isCollapsed ? 0 : 34,
                                justifyContent: "center",
                            }}
                        >
                            <LogoutIcon fontSize="small" />
                        </ListItemIcon>
                        {!isCollapsed && (
                            <ListItemText
                                primary="Logout"
                                primaryTypographyProps={{ fontSize: 13 }}
                            />
                        )}
                    </ListItemButton>
                </Tooltip>
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
                    sx={{ "& .MuiDrawer-paper": { width: SIDEBAR_EXPANDED } }}
                >
                    {sidebarContent(false)}
                </Drawer>
            </>
        );
    }

    const currentWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: currentWidth,
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                    width: currentWidth,
                    boxSizing: "border-box",
                    border: "none",
                    overflowX: "hidden",
                    transition: theme.transitions.create("width", {
                        easing: theme.transitions.easing.sharp,
                        duration: collapsed
                            ? theme.transitions.duration.leavingScreen
                            : theme.transitions.duration.enteringScreen,
                    }),
                },
                transition: theme.transitions.create("width", {
                    easing: theme.transitions.easing.sharp,
                    duration: collapsed
                        ? theme.transitions.duration.leavingScreen
                        : theme.transitions.duration.enteringScreen,
                }),
            }}
        >
            {sidebarContent(collapsed)}
        </Drawer>
    );
}
