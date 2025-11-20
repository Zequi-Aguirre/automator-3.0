import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Container,
    Snackbar,
    Alert,
    Button
} from '@mui/material';

import AdminCountiesTable from './adminCountiesTable/AdminCountiesTable';
import CustomPagination from '../../Pagination';
import countyService from '../../../services/county.service';
import { County } from '../../../types/countyTypes';
import ImportCountiesDialog from './importCountiesDialog/importCountiesDialog.tsx';

const AdminCountiesSection = () => {
    const [counties, setCounties] = useState<County[]>([]);
    const [count, setCount] = useState(0);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(100);

    const [loading, setLoading] = useState(true);

    const [importOpen, setImportOpen] = useState(false);

    const [snack, setSnack] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const showNotification = useCallback((message: string, severity: 'success' | 'error') => {
        setSnack({ open: true, message, severity });
    }, []);

    const fetchCounties = useCallback(async () => {
        setLoading(true);
        try {
            const data = await countyService.getMany({ page, limit });
            setCounties(data.counties);
            setCount(data.count);
        } catch (err) {
            showNotification('Failed to fetch counties', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, limit, showNotification]);

    useEffect(() => {
        fetchCounties();
    }, [fetchCounties]);

    const closeSnackbar = () => {
        setSnack(prev => ({ ...prev, open: false }));
    };

    const handleImportSuccess = (summary: { imported?: number; rejected?: number }) => {
        setPage(1);
        setTimeout(fetchCounties, 0);

        const imported = summary.imported ?? 0;
        const rejected = summary.rejected ?? 0;

        showNotification(
            `Import complete. Imported ${imported} county${imported === 1 ? '' : 'ies'}${rejected ? `, rejected ${rejected}` : ''}.`,
            'success'
        );
    };

    return (
        <Container
            maxWidth={false}
            sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0 }}
        >
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        Counties
                    </Typography>

                    <Button variant="contained" onClick={() => { setImportOpen(true); }}>
                        Import counties
                    </Button>
                </Box>

                {loading
                ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                )
                : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                        <Box sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
                            <AdminCountiesTable
                                counties={counties}
                                setCounties={setCounties}
                            />
                        </Box>
                        <Box sx={{ backgroundColor: 'background.paper' }}>
                            <CustomPagination
                                page={page}
                                setPage={setPage}
                                limit={limit}
                                rows={count}
                                setLimit={setLimit}
                            />
                        </Box>
                    </Box>
                )}
            </Box>

            <ImportCountiesDialog
                open={importOpen}
                onClose={() => { setImportOpen(false); }}
                onSuccess={handleImportSuccess}
            />

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={closeSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert severity={snack.severity} onClose={closeSnackbar} variant="filled">
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminCountiesSection;