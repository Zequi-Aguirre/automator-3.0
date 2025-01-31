import {Routes, Route} from "react-router-dom";
import UserDashboard from "../../views/userViews/userDashboard/UserDashboard.tsx";
import VerifyUser from "../../middleware/VerifyUser"

const ProtectedRoutes = () => {
    return (
        <Routes>
            <Route path="/u/dashboard" element={
                <VerifyUser>
                    <UserDashboard/>
                </VerifyUser>
            }/>
        </Routes>
    );
};

export default ProtectedRoutes;
