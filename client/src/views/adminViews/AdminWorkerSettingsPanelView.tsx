import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import WorkerSettingsPanel from '../../components/admin/workerSettings/WorkerSettingsPanel';
import AdminJobsSection from '../../components/admin/adminJobsSection/AdminJobsSection';

const AdminWorkerSettingsPanelView = () => {
    const [tab, setTab] = useState(0);

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 4, pt: 2 }}>
                <Tabs value={tab} onChange={(_, v: number) => setTab(v)}>
                    <Tab label="Settings" />
                    <Tab label="Jobs" />
                </Tabs>
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                {tab === 0 && <WorkerSettingsPanel />}
                {tab === 1 && <AdminJobsSection />}
            </Box>
        </Box>
    );
};

export default AdminWorkerSettingsPanelView;
