import { useLocation } from "react-router-dom";
import DataContext from "../context/DataContext.tsx";
import { useContext, useEffect } from "react";
import LoginForm from "../components/loginSection/loginFrom/LoginForm.tsx";

export default function LoginPage() {
    const location = useLocation();
    const { setSession, setRole } = useContext(DataContext);
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const sessionExpired = searchParams.get('sessionExpired');
        if (sessionExpired === 'true') {
            setSession(null);
            setRole('');
        }
    }, [location.search, setSession, setRole]);

    return <LoginForm />;
}
