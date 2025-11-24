import {Routes, Route} from "react-router-dom";
import UserDashboard from "../../views/userViews/UserLeadsView.tsx";
import VerifyUser from "../../middleware/VerifyUser"
import AdminLeadDetailsView from "../../views/adminViews/AdminLeadDetailsView.tsx";

const ProtectedRoutes = () => {
    return (
        <>
            <Routes>
                <Route path="/u/leads" element={
                    <VerifyUser>
                        <UserDashboard/>
                    </VerifyUser>
                }/>
                <Route path="/u/leads/:id" element={
                    <VerifyUser>
                        <AdminLeadDetailsView/>
                    </VerifyUser>
                }/>
            </Routes>
        </>
    );
};

export default ProtectedRoutes;
