import {Routes, Route} from "react-router-dom";
import UserDashboard from "../../views/userViews/UserLeadsView.tsx";
import VerifyUser from "../../middleware/VerifyUser"

const ProtectedRoutes = () => {
    return (
        <Routes>
            <Route path="/u/leads" element={
                <VerifyUser>
                    <UserDashboard/>
                </VerifyUser>
            }/>
        </Routes>
    );
};

export default ProtectedRoutes;
