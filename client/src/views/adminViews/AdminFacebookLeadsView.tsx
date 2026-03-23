// TICKET-143: Facebook Lead Ads admin view
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControl,
    IconButton,
    InputLabel,
    Link,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useEffect, useCallback, useState } from 'react';
import facebookService, { FacebookLeadRecord } from '../../services/facebook.service.tsx';
import sourceService from '../../services/source.service.tsx';
import { Source } from '../../types/sourceTypes';

const MATCH_STATUSES = ['pending', 'matched', 'unmatched'];

const MATCH_STATUS_COLOR: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
    pending: 'default',
    matched: 'success',
    unmatched: 'error',
};

export default function AdminFacebookLeadsView() {
    const [sources, setSources] = useState<Source[]>([]);
    const [records, setRecords] = useState<FacebookLeadRecord[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const [filterSourceId, setFilterSourceId] = useState('');
    const [filterMatchStatus, setFilterMatchStatus] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(50);

    const [syncing, setSyncing] = useState(false);
    const [matching, setMatching] = useState(false);
    const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    useEffect(() => {
        sourceService.getAll({ page: 1, limit: 200 }).then(r => { setSources(r.items); }).catch(() => {});
    }, []);

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const res = await facebookService.getLeads({
                source_id: filterSourceId !== '' ? filterSourceId : undefined,
                match_status: filterMatchStatus !== '' ? filterMatchStatus : undefined,
                page: page + 1,
                limit: rowsPerPage,
            });
            setRecords(res.items);
            setCount(res.count);
        } catch {
            setSnack({ open: true, message: 'Failed to load records', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, [filterSourceId, filterMatchStatus, page, rowsPerPage]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const handleSync = async () => {
        if (!filterSourceId) {
            setSnack({ open: true, message: 'Select a source to sync', severity: 'error' });
            return;
        }
        setSyncing(true);
        try {
            const res = await facebookService.syncSource(filterSourceId);
            setSnack({ open: true, message: `Sync done — ${res.fetched} fetched, ${res.matched} matched`, severity: 'success' });
            fetchRecords();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Sync failed';
            setSnack({ open: true, message: msg, severity: 'error' });
        } finally {
            setSyncing(false);
        }
    };

    const handleMatch = async () => {
        setMatching(true);
        try {
            const res = await facebookService.runMatching();
            setSnack({ open: true, message: `Matching done — ${res.processed} processed, ${res.matched} matched`, severity: 'success' });
            fetchRecords();
        } catch {
            setSnack({ open: true, message: 'Matching failed', severity: 'error' });
        } finally {
            setMatching(false);
        }
    };

    const closeSnack = () => { setSnack(s => ({ ...s, open: false })); };

    return (
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
                Facebook Lead Ads
            </Typography>

            {/* Filter bar */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Source</InputLabel>
                    <Select
                        value={filterSourceId}
                        label="Source"
                        onChange={(e) => { setFilterSourceId(e.target.value); setPage(0); }}
                    >
                        <MenuItem value="">All sources</MenuItem>
                        {sources.map(s => (
                            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Match Status</InputLabel>
                    <Select
                        value={filterMatchStatus}
                        label="Match Status"
                        onChange={(e) => { setFilterMatchStatus(e.target.value); setPage(0); }}
                    >
                        <MenuItem value="">All</MenuItem>
                        {MATCH_STATUSES.map(s => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <IconButton onClick={fetchRecords} disabled={loading} title="Refresh">
                    <RefreshIcon />
                </IconButton>

                <Box sx={{ flexGrow: 1 }} />

                <Button
                    variant="outlined"
                    startIcon={<SyncIcon />}
                    onClick={handleSync}
                    disabled={syncing ?? !filterSourceId}
                >
                    {syncing
                        ? 'Syncing…'
                        : 'Pull Historical'}
                </Button>
                <Button
                    variant="outlined"
                    onClick={handleMatch}
                    disabled={matching}
                >
                    {matching
                        ? 'Running…'
                        : 'Re-run Matching'}
                </Button>
            </Box>

            {/* Table */}
            <TableContainer component={Paper} sx={{ flexGrow: 1, overflow: 'auto' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Source</TableCell>
                            <TableCell>Contact</TableCell>
                            <TableCell>Form</TableCell>
                            <TableCell>Campaign</TableCell>
                            <TableCell>FB Created</TableCell>
                            <TableCell>Match</TableCell>
                            <TableCell>Lead</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading
                            ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            )
                            : records.length === 0
                                ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                                                No records found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )
                                : records.map((r) => (
                                    <TableRow key={r.id} hover>
                                        <TableCell>{r.source_name ?? '—'}</TableCell>
                                        <TableCell>
                                            <Box>
                                                {r.phone && <Typography variant="body2">{r.phone}</Typography>}
                                                {r.email && <Typography variant="caption" color="text.secondary">{r.email}</Typography>}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title={r.fb_form_id ?? ''}>
                                                <Typography variant="body2" sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {r.fb_form_name ?? r.fb_form_id ?? '—'}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {r.fb_campaign_name ?? '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {r.fb_created_time
                                                ? new Date(r.fb_created_time).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={r.match_status}
                                                size="small"
                                                color={MATCH_STATUS_COLOR[r.match_status] ?? 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {r.automator_lead_id
                                                ? (
                                                    <IconButton
                                                        size="small"
                                                        component={Link}
                                                        href={`/leads/${r.automator_lead_id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <OpenInNewIcon fontSize="small" />
                                                    </IconButton>
                                                )
                                                : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                component="div"
                count={count}
                page={page}
                onPageChange={(_, p) => { setPage(p); }}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[50]}
            />

            <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack}>
                <Alert severity={snack.severity} onClose={closeSnack}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
