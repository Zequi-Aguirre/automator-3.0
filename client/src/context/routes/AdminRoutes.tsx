import { Routes, Route } from "react-router-dom";
import VerifyAdmin from "../../middleware/VerifyAdmin"
import AdminLeadsView from "../../views/adminViews/AdminLeadsView.tsx";
import AdminLeadDetailsView from "../../views/adminViews/AdminLeadDetailsView.tsx";
import AdminCampaignsView from "../../views/adminViews/AdminCampaignsView.tsx";
import WorkerSettingsPanel from "../../views/adminViews/AdminWorkerSettingsPanelView.tsx";
import AdminJobsSection from "../../views/adminViews/AdminWorkerJobsView.tsx";
import AdminJobDetailsView from "../../views/adminViews/AdminJobDetailsView.tsx";
import AdminCountiesView from "../../views/adminViews/AdminCountiesView.tsx";
import AdminCountyDetailsView from "../../views/adminViews/AdminCountyDetailsView.tsx";
import AdminLogsView from "../../views/adminViews/AdminLogsView.tsx";
import AdminBuyersView from "../../views/adminViews/AdminBuyersView.tsx";
import AdminSourcesView from "../../views/adminViews/AdminSourcesView.tsx";
import AdminSourceDetailsView from "../../views/adminViews/AdminSourceDetailsView.tsx";
import AdminLeadManagersView from "../../views/adminViews/AdminLeadManagersView.tsx";
import AdminLeadManagerDetailsView from "../../views/adminViews/AdminLeadManagerDetailsView.tsx";
import AdminActivityView from "../../views/adminViews/AdminActivityView.tsx";
import AdminUsersView from "../../views/adminViews/AdminUsersView.tsx";

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
                <Route path="/a/sources/:id" element={
                    <VerifyAdmin>
                        <AdminSourceDetailsView/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/lead-managers" element={
                    <VerifyAdmin>
                        <AdminLeadManagersView/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/lead-managers/:id" element={
                    <VerifyAdmin>
                        <AdminLeadManagerDetailsView/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/counties" element={
                    <VerifyAdmin>
                        <AdminCountiesView/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/counties/:id" element={
                    <VerifyAdmin>
                        <AdminCountyDetailsView/>
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
                <Route path="/a/activity" element={
                    <VerifyAdmin>
                        <AdminActivityView/>
                    </VerifyAdmin>
                }/>
                <Route path="/a/users" element={
                    <VerifyAdmin>
                        <AdminUsersView/>
                    </VerifyAdmin>
                }/>
            </Routes>

        </>
    );
};

export default AdminRoutes;
