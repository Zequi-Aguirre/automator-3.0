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

const adminPages = ['Dashboard', 'Campaigns', 'Settings', 'Worker Jobs'];
const userPages = ['Dashboard'];
const commonPages = ['Logout'];

export default function NavBar() {
    const { setSession, setRole, role, setLoggedInUser } = useContext(DataContext)
    const navigate = useNavigate();
    const location = useLocation();
    const [isAdmin, setIsAdmin] = useState(false)
    const [currentPage, setCurrentPage] = useState<string>('');

    useEffect(() => {
        if (isAdmin) {
            userService.getUserInfo().then((response) => {
                setLoggedInUser(response)
            })
        }
    }, [isAdmin, setLoggedInUser]);

    const handleNavItemClick = (page: string) => {
        switch (page) {
            case 'Dashboard':
                isAdmin ? navigate('/a/dashboard') : navigate('/b/dashboard');
                break;
            case 'Buyers':
                navigate('/a/buyers');
                break;
            case 'Campaigns':
                navigate('/a/campaigns');
                break;
            case 'Leads':
                navigate('/b/leads');
                break;
            case 'Logout':
                userService.signOut();
                setRole('');
                setSession(null);
                setLoggedInUser(null);
                navigate('/login');
                break;
            case 'Settings':
                navigate('/a/settings');
                break;
            case 'Users':
                navigate('/a/users');
                break;
            case 'Worker Jobs':
                navigate('/a/worker-jobs');
                break;
            default:
            // Handle other cases or do nothing
        }
    }

    // useEffect to get user role and set current page
    useEffect(() => {
        setIsAdmin(role === 'admin' || role === 'superadmin');
        switch (true) {
            case location.pathname.includes('dashboard'):
                setCurrentPage('Dashboard');
                break;
            case location.pathname.includes('buyers'):
                setCurrentPage('Buyers');
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