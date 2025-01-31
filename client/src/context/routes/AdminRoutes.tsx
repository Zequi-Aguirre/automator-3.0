import { Routes, Route } from "react-router-dom";
import VerifyAdmin from "../../middleware/VerifyAdmin"
import AdminDashboard from "../../views/adminViews/AdminDashboard.tsx";
import AdminLeadDetails from "../../views/adminViews/AdminLeadDetails.tsx";
import AdminCampaigns from "../../views/adminViews/AdminCampaigns.tsx";
import AdminCampaignDetails from "../../views/adminViews/AdminCampaignDetails.tsx";
import WorkerSettingsPanel from "../../views/adminViews/AdminWorkerSettingsPanel.tsx";
import AdminJobsSection from "../../views/adminViews/AdminWorkerJobs.tsx";
import AdminJobDetails from "../../views/adminViews/AdminJobDetails.tsx";

const AdminRoutes = () => {
    return (
        <>
            <Routes>
                <Route path="/a/dashboard" element={
                    <VerifyAdmin>
                        <AdminDashboard/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/leads/:id" element={
                    <VerifyAdmin>
                        <AdminLeadDetails/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/campaigns" element={
                    <VerifyAdmin>
                        <AdminCampaigns/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/campaigns/:id" element={
                    <VerifyAdmin>
                        <AdminCampaignDetails/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/settings" element={
                    <VerifyAdmin>
                        <WorkerSettingsPanel/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/worker-jobs" element={
                    <VerifyAdmin>
                        <AdminJobsSection/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/worker-jobs/:id" element={
                    <VerifyAdmin>
                        <AdminJobDetails/>
                    </VerifyAdmin>
                }/>

            </Routes>

        </>
    );
};

export default AdminRoutes;
