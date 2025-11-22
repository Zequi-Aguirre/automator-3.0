import {
    AppBar,
    Box,
    Button,
    Container,
    Toolbar,
} from "@mui/material";
import {useLocation, useNavigate} from "react-router-dom";
import {useContext, useEffect, useState} from "react";
import userService from "../../services/user.service.tsx";
import DataContext from "../../context/DataContext.tsx";

const adminPages = ['Leads', 'Campaigns', 'Affiliates', 'Investors', 'Counties', 'Logs', 'Settings', 'Worker Jobs'];
const userPages = ['Leads'];
const commonPages = ['Logout'];

export default function NavBar() {
    const { setSession, setRole, role, setLoggedInUser } = useContext(DataContext)
    const navigate = useNavigate();
    const location = useLocation();
    const [isAdmin, setIsAdmin] = useState(role === 'admin' || role === 'superadmin');
    const [currentPage, setCurrentPage] = useState<string>('');

    const handleNavItemClick = (page: string) => {
        switch (page) {
            case 'Leads':
                if (isAdmin) {
                    navigate('/a/leads');
                } else {
                    navigate('/u/leads');
                }
                break;
            case 'Campaigns':
                navigate('/a/campaigns');
                break;
            case 'Affiliates':
                navigate('/a/affiliates');
                break;
            case 'Counties':
                navigate('/a/counties');
                break;
            case 'Settings':
                navigate('/a/settings');
                break;
            case 'Worker Jobs':
                navigate('/a/worker-jobs');
                break;
            case 'Logout':
                userService.signOut();
                setRole('');
                setSession(null);
                setLoggedInUser(null);
                navigate('/login');
                break;
            default:
            // Handle other cases or do nothing
        }
    }

    // useEffect to get user role and set current page
    useEffect(() => {
        setIsAdmin(role === 'admin' || role === 'superadmin');
        switch (true) {
            case location.pathname.includes('leads'):
                setCurrentPage('Leads');
                break;
            case location.pathname.includes('campaigns'):
                setCurrentPage('Campaigns');
                break;
            case location.pathname.includes('settings'):
                setCurrentPage('Settings');
                break;
            case location.pathname.includes('users'):
                setCurrentPage('Users');
                break;
            case location.pathname.includes('worker-jobs'):
                setCurrentPage('Worker Jobs');
                break;
            default:
                setCurrentPage('');
        }
    }, [location.pathname, role])

    return !role
        ? null
        : (
            <AppBar position="static" sx={{
                height: '3rem',
                minHeight: '2rem'
            }}>
                <Container maxWidth={false} disableGutters={true}>
                    <Toolbar disableGutters sx={{
                        height: '2rem',
                        p: 0,
                        m: 0,
                        minHeight: '2rem',
                        marginTop: '-6px',
                    }}>
                        <Box sx={{
                            ml: 3, flexGrow: 1
                        }}>
                            {(isAdmin ? adminPages : userPages).map((page) => (
                                <Button
                                    key={page}
                                    onClick={() => {
                                        handleNavItemClick(page);
                                    }}
                                    sx={{ color: currentPage === page ? 'red' : 'white', fontWeight: currentPage === page ? 'bold' : 'normal' }}
                                >
                                    {page}
                                </Button>
                            ))}
                            {commonPages.map((page) => (
                                <Button
                                    key={page}
                                    onClick={() => {
                                        handleNavItemClick(page);
                                    }}
                                    sx={{ color: 'white' }}
                                >
                                    {page}
                                </Button>
                            ))}
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>
        );
}