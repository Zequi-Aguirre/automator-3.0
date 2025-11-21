import { useCallback, useContext, useEffect, useState } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Container,
    Snackbar,
    Alert,
    Button,
    TextField,
    Stack
} from '@mui/material';

import AdminCountiesTable from './adminCountiesTable/AdminCountiesTable';
import CustomPagination from '../../Pagination';
import countyService from '../../../services/county.service';
import { County } from '../../../types/countyTypes';
import ImportCountiesDialog from './importCountiesDialog/importCountiesDialog.tsx';
import DataContext from '../../../context/DataContext';

const AdminCountiesSection = () => {
    const { countyFilters, setCountyFilters } = useContext(DataContext);

    // Local UI state (mirrors context)
    const [page, setPage] = useState(countyFilters.page);
    const [limit, setLimit] = useState(countyFilters.limit);
    const [search, setSearch] = useState(countyFilters.search);
    const [status, setStatus] = useState(
        countyFilters.status || "all"
    );

    const [counties, setCounties] = useState<County[]>([]);
    const [count, setCount] = useState(0);

    const [loading, setLoading] = useState(true);
    const [importOpen, setImportOpen] = useState(false);

    const [snack, setSnack] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    // Sync UI filters → context filters
    useEffect(() => {
        const f = countyFilters;

        const changed =
            f.page !== page ||
            f.limit !== limit ||
            f.search !== search ||
            f.status !== status;

        if (changed) {
            setCountyFilters({
                ...f,
                page,
                limit,
                search,
                status
            });
        }
    }, [page, limit, search, status, countyFilters, setCountyFilters]);

    // Fetch counties on context filter change
    const fetchCounties = useCallback(async () => {
        setLoading(true);
        try {
            const res = await countyService.getMany(countyFilters);
            setCounties(res.counties);
            setCount(res.count);
        } catch {
            setSnack({ open: true, message: "Failed to fetch counties", severity: "error" });
        } finally {
            setLoading(false);
        }
    }, [countyFilters]);

    useEffect(() => {
        fetchCounties();
    }, [fetchCounties]);

    const closeSnackbar = () => {
        setSnack(prev => ({ ...prev, open: false }));
    };

    const handleImportSuccess = (summary: { imported?: number; rejected?: number }) => {
        setPage(1);

        const imported = summary.imported ?? 0;
        const rejected = summary.rejected ?? 0;

        setSnack({
            open: true,
            message: `Imported ${imported}, rejected ${rejected}`,
            severity: "success"
        });

        fetchCounties();
    };

    const currentVariant = (cond: boolean): "contained" | "outlined" =>
        cond ? "contained" : "outlined";

    return (
        <Container maxWidth={false} sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        Counties
                    </Typography>

                    <Button variant="contained" onClick={() => { setImportOpen(true); }}>
                        Import counties
                    </Button>
                </Box>

                {/* FILTERS */}
                <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: "center" }}>
                    <Button variant={currentVariant(status === 'all')} onClick={() => { setStatus("all"); }}>
                        All
                    </Button>

                    <Button variant={currentVariant(status === 'active')} onClick={() => { setStatus("active"); }}>
                        Active
                    </Button>

                    <Button variant={currentVariant(status === 'blacklisted')} onClick={() => { setStatus("blacklisted"); }}>
                        Blacklisted
                    </Button>

                    <TextField
                        size="small"
                        label="Search counties"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        sx={{ width: 200 }}
                    />
                </Stack>

                {loading
? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                )
: (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: "100%" }}>
                        <Box sx={{ flexGrow: 1, overflow: "auto" }}>
                            <AdminCountiesTable
                                counties={counties}
                                setCounties={setCounties}
                            />
                        </Box>

                        <Box sx={{ backgroundColor: "background.paper" }}>
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

            <ImportCountiesDialog
                open={importOpen}
                onClose={() => { setImportOpen(false); }}
                onSuccess={handleImportSuccess}
            />

            <Snackbar open={snack.open} autoHideDuration={4000} onClose={closeSnackbar}>
                <Alert severity={snack.severity} onClose={closeSnackbar} variant="filled">
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminCountiesSection;