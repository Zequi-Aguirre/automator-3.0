import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import AdminActivitySection from '../../components/admin/adminActivitySection/AdminActivitySection';
import AdminSendLogsSection from '../../components/admin/adminSendLogsSection/AdminSendLogsSection';

export default function AdminActivityView() {
    const [tab, setTab] = useState(0);

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 4, pt: 2 }}>
                <Tabs value={tab} onChange={(_, v: number) => setTab(v)}>
                    <Tab label="Activity" />
                    <Tab label="Send Logs" />
                </Tabs>
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                {tab === 0 && <AdminActivitySection />}
                {tab === 1 && <AdminSendLogsSection />}
            </Box>
        </Box>
    );
}
