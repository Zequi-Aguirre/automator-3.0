import { Routes, Route } from "react-router-dom";
import VerifyAdmin from "../../middleware/VerifyAdmin"
import AdminLeadsView from "../../views/adminViews/AdminLeadsView.tsx";
import AdminLeadDetailsView from "../../views/adminViews/AdminLeadDetailsView.tsx";
import AdminCampaignsView from "../../views/adminViews/AdminCampaignsView.tsx";
import WorkerSettingsPanel from "../../views/adminViews/AdminWorkerSettingsPanelView.tsx";
import AdminJobsSection from "../../views/adminViews/AdminWorkerJobsView.tsx";
import AdminJobDetailsView from "../../views/adminViews/AdminJobDetailsView.tsx";
import AdminAffiliatesView from "../../views/adminViews/AdminAffiliatesView.tsx";
import AdminAffiliateDetailsView from "../../views/adminViews/AdminAffiliatesDetailsView.tsx";
import AdminCountiesView from "../../views/adminViews/AdminCountiesView.tsx";
import AdminLogsView from "../../views/adminViews/AdminLogsView.tsx";
import AdminBuyersView from "../../views/adminViews/AdminBuyersView.tsx";
import AdminSourcesView from "../../views/adminViews/AdminSourcesView.tsx";

const AdminRoutes = () => {
    return (
        <>
            <Routes>
                <Route path="/a/leads" element={
                    <VerifyAdmin>
                        <AdminLeadsView/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/leads/:id" element={
                    <VerifyAdmin>
                        <AdminLeadDetailsView/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/campaigns" element={
                    <VerifyAdmin>
                        <AdminCampaignsView/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/affiliates" element={
                    <VerifyAdmin>
                        <AdminAffiliatesView/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/affiliates/:id" element={
                    <VerifyAdmin>
                        <AdminAffiliateDetailsView/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/buyers" element={
                    <VerifyAdmin>
                        <AdminBuyersView/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/sources" element={
                    <VerifyAdmin>
                        <AdminSourcesView/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/counties" element={
                    <VerifyAdmin>
                        <AdminCountiesView/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/logs" element={
                    <VerifyAdmin>
                        <AdminLogsView/>
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
                        <AdminJobDetailsView/>
                    </VerifyAdmin>
                }/>
            </Routes>

        </>
    );
};

export default AdminRoutes;
