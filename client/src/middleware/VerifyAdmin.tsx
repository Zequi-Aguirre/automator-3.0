import {useContext, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import DataContext from "../context/DataContext.tsx";

type Props = {
    children: React.ReactNode;
};

const VerifyAdmin = ({children}: Props) => {
    const { session, setSession, role, setRole, setLoggedInUser } = useContext(DataContext);
    const navigate = useNavigate();
    useEffect(() => {
        if (!session) {
            navigate('/login');
        } else {
            if (role !== 'admin' && role !== 'superadmin') {
                setSession(null);
                setLoggedInUser(null);
                setRole('');
                navigate('/');
            }
        }
    }, [session, navigate, role, setSession, setLoggedInUser, setRole]);

    return <>{children}</>;
};

export default VerifyAdmin;
