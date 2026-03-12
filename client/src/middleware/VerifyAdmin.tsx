import {useContext, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import DataContext from "../context/DataContext.tsx";
import userService from "../services/user.service.tsx";

type Props = {
    children: React.ReactNode;
};

const VerifyAdmin = ({children}: Props) => {
    const { session, setSession, role, setRole, setLoggedInUser } = useContext(DataContext);
    const navigate = useNavigate();
    useEffect(() => {
        if (!session) {
            navigate('/login');
            return;
        }
        if (role !== 'admin' && role !== 'superadmin') {
            setSession(null);
            setLoggedInUser(null);
            setRole('');
            navigate('/');
            return;
        }
        // Refresh user info (including permissions) on every page load
        void userService.getUserInfo().then((user) => {
            setLoggedInUser(user);
            setRole(user.role);
        }).catch(() => {
            setSession(null);
            setLoggedInUser(null);
            navigate('/login');
        });
    }, [session, navigate, role, setSession, setLoggedInUser, setRole]);

    return <>{children}</>;
};

export default VerifyAdmin;
