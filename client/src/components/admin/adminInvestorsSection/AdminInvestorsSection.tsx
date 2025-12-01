import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Container,
    Snackbar,
    Alert
} from '@mui/material';

import AdminInvestorsTable from './adminInvestorsTable/AdminInvestorsTable.tsx';
import CustomPagination from '../../Pagination';
import investorService from "../../../services/investor.service.tsx";
import { Investor } from "../../../types/investorTypes.ts";

const AdminInvestorsSection = () => {
    const [investors, setInvestors] = useState<Investor[]>([]);
    const [count, setCount] = useState(0);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(100);

    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const showNotification = useCallback((message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const fetchAffiliates = useCallback(async () => {
        setLoading(true);
        try {
            const data = await investorService.getMany({ page, limit });
            setInvestors(data.investors);
            setCount(data.count);
        } catch (err: unknown) {
            showNotification('Failed to fetch investors', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, limit, showNotification]);

    useEffect(() => {
        fetchAffiliates();
    }, [fetchAffiliates]);

    const handleSnackbarClose = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    return (
        <Container
            maxWidth={false}
            sx={{
                height: 'calc(100vh - 64px)',
                display: 'flex',
                flexDirection: 'column',
                p: 0
            }}
        >
            <Box
                sx={{
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden'
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold' }}>
                        Investors
                    </Typography>
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
                            <AdminInvestorsTable
                                investors={investors}
                                setInvestors={setInvestors}
                            />
                        </Box>

                        <Box sx={{ backgroundColor: 'background.paper' }}>
                            <CustomPagination
                                page={page}
                                setPage={setPage}
                                rows={count}
                                limit={limit}
                                setLimit={setLimit}
                            />
                        </Box>
                    </Box>
                )}
            </Box>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminInvestorsSection;