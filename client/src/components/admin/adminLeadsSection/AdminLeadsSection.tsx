import {useEffect, useState, useCallback} from 'react';
import LeadsService from "../../../services/lead.service";
import AdminLeadsTable from "./adminLeadsTable/AdminLeadsTable.tsx";
import CustomPagination from "../../Pagination";
import {
    Box,
    Typography,
    CircularProgress,
    Container,
    Button,
    Snackbar,
    Alert
} from "@mui/material";
import { Lead } from "../../../types/leadTypes.ts";
import ImportLeadsDialog from "./importLeadsDialog/importLeadsDialog.tsx";

const AdminLeadsSection = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [page, setPage] = useState(1);
    const [leadCount, setLeadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState(100);

    const [importOpen, setImportOpen] = useState(false);
    const [snack, setSnack] = useState<{open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error'}>({
        open: false, message: '', severity: 'success'
    });

    const fetchLeads = useCallback(() => {
        setLoading(true);
        LeadsService.getMany({ page, limit }).then((response) => {
            setLeads(response.leads);
            setLeadCount(response.count);
            setLoading(false);
        }).catch((err) => {
            setLoading(false);
            setSnack({ open: true, message: err?.message || 'Failed to load leads', severity: 'error' });
        });
    }, [page, limit]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const handleImportSuccess = (summary: { imported?: number; rejected?: number }) => {
        // After a successful import, go back to first page and refresh.
        setPage(1);
        // fetch again after the state change; minor defer to ensure page=1 has applied
        setTimeout(fetchLeads, 0);
        const imported = summary?.imported ?? 0;
        const rejected = summary?.rejected ?? 0;
        setSnack({
            open: true,
            message: `Import complete. Imported ${imported} lead${imported === 1 ? '' : 's'}${rejected ? `, rejected ${rejected}` : ''}.`,
            severity: 'success'
        });
    };

    return (
        <Container maxWidth={false} sx={{height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0}}>
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h2" sx={{fontWeight: 'bold'}}>Leads</Typography>
                    <Button variant="contained" onClick={() => {
                        setImportOpen(true)
                    }}>
                        Import leads
                    </Button>
                </Box>

                {loading
? (
                    <Box sx={{display: 'flex', justifyContent: 'center', p: 4}}>
                        <CircularProgress/>
                    </Box>
                )
: (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                        <Box sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
                            <AdminLeadsTable
                                leads={leads}
                                setLeads={setLeads}
                            />
                        </Box>
                        <Box sx={{ backgroundColor: 'background.paper' }}>
                            <CustomPagination
                                page={page}
                                setPage={setPage}
                                rows={leadCount}
                                limit={limit}
                                setLimit={setLimit}
                            />
                        </Box>
                    </Box>
                )}
            </Box>

            <ImportLeadsDialog
                open={importOpen}
                onClose={() => {
                    setImportOpen(false)
                }}
                onSuccess={handleImportSuccess}
            />

            <Snackbar
                open={snack.open}
                autoHideDuration={5000}
                onClose={() => {
                    setSnack(s => ({...s, open: false}))
                }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => {
                    setSnack(s => ({...s, open: false}))
                }} severity={snack.severity} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminLeadsSection;