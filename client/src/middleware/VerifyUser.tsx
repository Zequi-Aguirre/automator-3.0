import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DataContext from "../context/DataContext.tsx";

type Props = {
    children: React.ReactNode;
};

const VerifyUser = ({ children }: Props) => {
    const {
        session,
        setSession,
        role,
        setRole,
        setLoggedInUser,
        allowLogin,
    } = useContext(DataContext);

    const navigate = useNavigate();

    useEffect(() => {
        // Not logged in? go to login
        if (!session) {
            navigate("/login");
        }

        // Logged in: for "user" routes we generally allow any authenticated role.
        // If you want to restrict to specific roles, add checks here.
    }, [
        session,
        role,
        allowLogin,
        navigate,
        setSession,
        setLoggedInUser,
        setRole,
    ]);

    return <>{children}</>;
};

export default VerifyUser;