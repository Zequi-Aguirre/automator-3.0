import {Navigate, useNavigate} from "react-router-dom";
import {useContext} from "react";
import DataContext from "../context/DataContext.tsx";

type Props = {
    children: React.ReactNode;
};

const VerifyUser = ({children}: Props) => {
    const {session, allowLogin, setSession, setLoggedInUser, setRole} = useContext(DataContext);
    const navigate = useNavigate();

    if (!allowLogin) {
        setSession(null);
        setLoggedInUser(null);
        setRole('');
        navigate('/');
    }
    if (!session) {
        return <Navigate to="/login"/>;
    }

    return <>{children}</>;

};

export default VerifyUser;
