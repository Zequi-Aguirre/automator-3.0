import { Routes, Route } from "react-router-dom";
import RequireAuth from "../../middleware/RequireAuth";
import AdminLeadsView from "../../views/adminViews/AdminLeadsView.tsx";
import AdminLeadDetailsView from "../../views/adminViews/AdminLeadDetailsView.tsx";
import AdminCampaignsView from "../../views/adminViews/AdminCampaignsView.tsx";
import WorkerSettingsPanel from "../../views/adminViews/AdminWorkerSettingsPanelView.tsx";
import AdminCountiesView from "../../views/adminViews/AdminCountiesView.tsx";
import AdminCountyDetailsView from "../../views/adminViews/AdminCountyDetailsView.tsx";
import AdminBuyersView from "../../views/adminViews/AdminBuyersView.tsx";
import AdminBuyerDetailsView from "../../views/adminViews/AdminBuyerDetailsView.tsx";
import AdminSourcesView from "../../views/adminViews/AdminSourcesView.tsx";
import AdminSourceDetailsView from "../../views/adminViews/AdminSourceDetailsView.tsx";
import AdminLeadManagersView from "../../views/adminViews/AdminLeadManagersView.tsx";
import AdminLeadManagerDetailsView from "../../views/adminViews/AdminLeadManagerDetailsView.tsx";
import AdminActivityView from "../../views/adminViews/AdminActivityView.tsx";
import AdminUsersView from "../../views/adminViews/AdminUsersView.tsx";
import AdminUserDetailsView from "../../views/adminViews/AdminUserDetailsView.tsx";
import AdminListsView from "../../views/adminViews/AdminListsView.tsx";
import ChangePasswordView from "../../views/ChangePasswordView";
import AdminZoeView from "../../views/adminViews/AdminZoeView.tsx";
import AdminReconciliationView from "../../views/adminViews/AdminReconciliationView.tsx";
import AdminPlatformConnectionsView from "../../views/adminViews/AdminPlatformConnectionsView.tsx";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/leads" element={<RequireAuth><AdminLeadsView /></RequireAuth>} />
            <Route path="/leads/:id" element={<RequireAuth><AdminLeadDetailsView /></RequireAuth>} />
            <Route path="/campaigns" element={<RequireAuth><AdminCampaignsView /></RequireAuth>} />
            <Route path="/buyers" element={<RequireAuth><AdminBuyersView /></RequireAuth>} />
            <Route path="/buyers/:id" element={<RequireAuth><AdminBuyerDetailsView /></RequireAuth>} />
            <Route path="/sources" element={<RequireAuth><AdminSourcesView /></RequireAuth>} />
            <Route path="/sources/:id" element={<RequireAuth><AdminSourceDetailsView /></RequireAuth>} />
            <Route path="/lead-managers" element={<RequireAuth><AdminLeadManagersView /></RequireAuth>} />
            <Route path="/lead-managers/:id" element={<RequireAuth><AdminLeadManagerDetailsView /></RequireAuth>} />
            <Route path="/counties" element={<RequireAuth><AdminCountiesView /></RequireAuth>} />
            <Route path="/counties/:id" element={<RequireAuth><AdminCountyDetailsView /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><WorkerSettingsPanel /></RequireAuth>} />
            <Route path="/activity" element={<RequireAuth><AdminActivityView /></RequireAuth>} />
            <Route path="/users" element={<RequireAuth><AdminUsersView /></RequireAuth>} />
            <Route path="/users/:id" element={<RequireAuth><AdminUserDetailsView /></RequireAuth>} />
            <Route path="/lists" element={<RequireAuth><AdminListsView /></RequireAuth>} />
            <Route path="/change-password" element={<RequireAuth><ChangePasswordView /></RequireAuth>} />
            <Route path="/zoe" element={<RequireAuth><AdminZoeView /></RequireAuth>} />
            <Route path="/reconciliation" element={<RequireAuth><AdminReconciliationView /></RequireAuth>} />
            <Route path="/platform-connections" element={<RequireAuth><AdminPlatformConnectionsView /></RequireAuth>} />
        </Routes>
    );
};

export default AppRoutes;
