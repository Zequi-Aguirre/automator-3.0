import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import AdminUsersSection from '../../components/admin/adminUsersSection/AdminUsersSection';
import AdminRolesSection from '../../components/admin/adminRolesSection/AdminRolesSection';

const AdminUsersView = () => {
    const [tab, setTab] = useState(0);

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 4, pt: 2 }}>
                <Tabs value={tab} onChange={(_, v: number) => setTab(v)}>
                    <Tab label="Users" />
                    <Tab label="Roles" />
                </Tabs>
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                {tab === 0 && <AdminUsersSection />}
                {tab === 1 && <AdminRolesSection />}
            </Box>
        </Box>
    );
};

export default AdminUsersView;
