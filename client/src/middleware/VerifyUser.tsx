import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DataContext from "../context/DataContext.tsx";
import userService from "../services/user.service.tsx";

type Props = {
    children: React.ReactNode;
};

const VerifyUser = ({ children }: Props) => {
    const {
        session,
        setSession,
        setRole,
        setLoggedInUser,
        allowLogin,
    } = useContext(DataContext);

    const navigate = useNavigate();

    useEffect(() => {
        if (!session) {
            navigate("/login");
            return;
        }
        // Refresh user info (including permissions) on every page load
        void userService.getUserInfo().then((user) => {
            setLoggedInUser(user);
            setRole(user.role);
        }).catch(() => {
            // If the session is invalid, sign out
            setSession(null);
            setLoggedInUser(null);
            navigate("/login");
        });
    }, [session, allowLogin, navigate, setSession, setLoggedInUser, setRole]);

    return <>{children}</>;
};

export default VerifyUser;