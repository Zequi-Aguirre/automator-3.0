// TICKET-137: Reconciliation importer
// TICKET-142: Records dashboard
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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tab,
    Tabs,
    Tooltip,
    Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useEffect, useRef, useState } from 'react';
import reconciliationService, { ImportResult, PlatformLeadRecord } from '../../services/reconciliation.service.tsx';
import buyerService from '../../services/buyer.service.tsx';
import { Buyer } from '../../types/buyerTypes';

const PLATFORMS = ['sellers', 'compass', 'pickle'];
const MATCH_STATUSES = ['pending', 'matched', 'unmatched', 'ambiguous'];

const MATCH_STATUS_COLOR: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
    pending: 'default',
    matched: 'success',
    unmatched: 'error',
    ambiguous: 'warning',
};

const PLATFORM_COLOR: Record<string, 'primary' | 'secondary' | 'default'> = {
    sellers: 'primary',
    compass: 'secondary',
    pickle: 'default',
};

export default function AdminReconciliationView() {
    const [tab, setTab] = useState(0);

    // ── Import tab ──────────────────────────────────────────────────────────
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [buyerId, setBuyerId] = useState('');
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Records tab ─────────────────────────────────────────────────────────
    const [records, setRecords] = useState<PlatformLeadRecord[]>([]);
    const [recordCount, setRecordCount] = useState(0);
    const [recordsLoading, setRecordsLoading] = useState(false);
    const [recordsError, setRecordsError] = useState<string | null>(null);

    const [filterPlatform, setFilterPlatform] = useState('');
    const [filterMatchStatus, setFilterMatchStatus] = useState('');
    const [filterBuyerId, setFilterBuyerId] = useState('');
    const [filterDisputed, setFilterDisputed] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(50);

    useEffect(() => {
        buyerService.getAll({ page: 1, limit: 200 }).then(r => { setBuyers(r.items); }).catch(() => {});
    }, []);

    useEffect(() => {
        if (tab === 1) void loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, filterPlatform, filterMatchStatus, filterBuyerId, filterDisputed, page]);

    async function loadRecords() {
        setRecordsLoading(true);
        setRecordsError(null);
        try {
            const result = await reconciliationService.getRecords({
                platform: filterPlatform || undefined,
                match_status: filterMatchStatus || undefined,
                automator_buyer_id: filterBuyerId || undefined,
                disputed: filterDisputed === 'true' ? true : undefined,
                page: page + 1,
                limit: rowsPerPage,
            });
            setRecords(result.items);
            setRecordCount(result.count);
        } catch {
            setRecordsError('Failed to load records');
        } finally {
            setRecordsLoading(false);
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportError(null);
        setImportResult(null);
        setImporting(true);
        try {
            const res = await reconciliationService.importFile(buyerId, file);
            setImportResult(res);
        } catch (err) {
            setImportError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    function resetFilters() {
        setFilterPlatform('');
        setFilterMatchStatus('');
        setFilterBuyerId('');
        setFilterDisputed('');
        setPage(0);
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" fontWeight={600} mb={2}>Reconciliation</Typography>

            <Tabs value={tab} onChange={(_e, v) => { setTab(v as number); }} sx={{ mb: 3 }}>
                <Tab label="Import" />
                <Tab label="Records" />
            </Tabs>

            {/* ── Import tab ── */}
            {tab === 0 && (
                <Box maxWidth={600}>
                    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Buyer</InputLabel>
                            <Select
                                value={buyerId}
                                label="Buyer"
                                onChange={e => { setBuyerId(e.target.value); setImportResult(null); setImportError(null); }}
                            >
                                {buyers.map(b => (
                                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                        <Button
                            variant="contained"
                            startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
                            disabled={!buyerId || importing}
                            onClick={() => { fileInputRef.current?.click(); }}
                            sx={{ alignSelf: 'flex-start' }}
                        >
                            {importing ? 'Importing...' : 'Upload & import'}
                        </Button>

                        {importError && (
                            <Alert severity="error" onClose={() => { setImportError(null); }}>{importError}</Alert>
                        )}
                        {importResult && (
                            <Alert severity="success">
                                Done — {importResult.row_count} rows imported (batch #{importResult.batch_id})
                            </Alert>
                        )}
                    </Paper>
                </Box>
            )}

            {/* ── Records tab ── */}
            {tab === 1 && (
                <Box>
                    {/* Filters */}
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Platform</InputLabel>
                            <Select value={filterPlatform} label="Platform" onChange={e => { setFilterPlatform(e.target.value); setPage(0); }}>
                                <MenuItem value=""><em>All</em></MenuItem>
                                {PLATFORMS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Match status</InputLabel>
                            <Select value={filterMatchStatus} label="Match status" onChange={e => { setFilterMatchStatus(e.target.value); setPage(0); }}>
                                <MenuItem value=""><em>All</em></MenuItem>
                                {MATCH_STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Buyer</InputLabel>
                            <Select value={filterBuyerId} label="Buyer" onChange={e => { setFilterBuyerId(e.target.value); setPage(0); }}>
                                <MenuItem value=""><em>All</em></MenuItem>
                                {buyers.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Disputed</InputLabel>
                            <Select value={filterDisputed} label="Disputed" onChange={e => { setFilterDisputed(e.target.value); setPage(0); }}>
                                <MenuItem value=""><em>All</em></MenuItem>
                                <MenuItem value="true">Disputed only</MenuItem>
                            </Select>
                        </FormControl>

                        <Button size="small" onClick={resetFilters}>Clear</Button>

                        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">{recordCount.toLocaleString()} records</Typography>
                            <Tooltip title="Refresh">
                                <IconButton size="small" onClick={() => { void loadRecords(); }} disabled={recordsLoading}>
                                    {recordsLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    {recordsError && <Alert severity="error" sx={{ mb: 2 }}>{recordsError}</Alert>}

                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Platform</TableCell>
                                    <TableCell>Buyer</TableCell>
                                    <TableCell>Contact</TableCell>
                                    <TableCell>Campaign</TableCell>
                                    <TableCell>Price</TableCell>
                                    <TableCell>Received</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Match</TableCell>
                                    <TableCell>Lead</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {records.length === 0 && !recordsLoading && (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                                            No records found
                                        </TableCell>
                                    </TableRow>
                                )}
                                {records.map(r => (
                                    <TableRow key={r.id} hover>
                                        <TableCell>
                                            <Chip
                                                label={r.platform}
                                                size="small"
                                                color={PLATFORM_COLOR[r.platform] ?? 'default'}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{r.buyer_name ?? r.platform_buyer_name ?? '—'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{r.phone_normalized ?? r.phone ?? '—'}</Typography>
                                            {r.email && <Typography variant="caption" color="text.secondary">{r.email}</Typography>}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
                                                {r.campaign_name ?? '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {r.price_cents != null
                                                ? `$${(r.price_cents / 100).toFixed(2)}`
                                                : <span style={{ color: '#aaa' }}>—</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {r.received_at ? new Date(r.received_at).toLocaleDateString() : '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {r.buyer_lead_status && (
                                                    <Chip label={r.buyer_lead_status} size="small" variant="outlined" />
                                                )}
                                                {r.disputed && (
                                                    <Chip label="disputed" size="small" color="warning" />
                                                )}
                                            </Box>
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
                                                    <Link href={`/leads/${r.automator_lead_id}`} target="_blank" underline="none">
                                                        <Tooltip title="Open lead">
                                                            <IconButton size="small">
                                                                <OpenInNewIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Link>
                                                )
                                                : <span style={{ color: '#aaa' }}>—</span>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <TablePagination
                            component="div"
                            count={recordCount}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            rowsPerPageOptions={[50]}
                            onPageChange={(_e, p) => { setPage(p); }}
                        />
                    </TableContainer>
                </Box>
            )}
        </Box>
    );
}
