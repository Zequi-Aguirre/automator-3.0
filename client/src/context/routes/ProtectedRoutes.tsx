import {Routes, Route} from "react-router-dom";
import UserDashboard from "../../views/userViews/UserLeadsView.tsx";
import VerifyUser from "../../middleware/VerifyUser"
import VerifyAdmin from "../../middleware/VerifyAdmin.tsx";
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
            </Routes>
            <Route path="/u/leads/:id" element={
                <VerifyAdmin>
                    <AdminLeadDetailsView/>
                </VerifyAdmin>
            }/>
        </>
    );
};

export default ProtectedRoutes;
