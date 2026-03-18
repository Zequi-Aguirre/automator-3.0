import { useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DataContext from "../context/DataContext.tsx";
import userService from "../services/user.service.tsx";

type Props = {
    children: React.ReactNode;
};

const RequireAuth = ({ children }: Props) => {
    const { session, setSession, setRole, setLoggedInUser, allowLogin } = useContext(DataContext);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!session) {
            navigate("/login");
            return;
        }
        // Refresh user info (including permissions) on every page load
        void userService.getUserInfo().then((user) => {
            setLoggedInUser(user);
            setRole(user.role);
            // Force password change if flagged
            if (user.must_change_password && location.pathname !== '/change-password') {
                navigate('/change-password');
            }
        }).catch(() => {
            setSession(null);
            setLoggedInUser(null);
            setRole('');
            navigate("/login");
        });
    }, [session, allowLogin, navigate, setSession, setLoggedInUser, setRole, location.pathname]);

    return <>{children}</>;
};

export default RequireAuth;
