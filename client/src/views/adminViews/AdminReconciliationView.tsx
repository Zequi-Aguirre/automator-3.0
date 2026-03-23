// TICKET-137: Reconciliation importer
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControl,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useEffect, useRef, useState } from 'react';
import reconciliationService, {
    BuyerMapping,
    PlatformBuyerSummary,
    PreviewResult,
} from '../../services/reconciliation.service.tsx';
import buyerService from '../../services/buyer.service.tsx';
import { Buyer } from '../../types/buyerTypes';

type Step = 'upload' | 'map_buyers' | 'done';

export default function AdminReconciliationView() {
    const [step, setStep] = useState<Step>('upload');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [mappings, setMappings] = useState<Record<string, string | null>>({});
    const [result, setResult] = useState<{ batch_id: number; row_count: number } | null>(null);

    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        buyerService.getAll({ page: 1, limit: 200 }).then(r => setBuyers(r.items)).catch(() => {});
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setLoading(true);
        try {
            const res = await reconciliationService.previewFile(file);
            setPreview(res);

            const initial: Record<string, string | null> = {};
            for (const buyer of res.platform_buyers) {
                initial[buyer.platform_buyer_id] = buyer.saved_automator_buyer_id;
            }
            setMappings(initial);
            setStep('map_buyers');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse file');
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleConfirm = async () => {
        if (!preview) return;

        setError(null);
        setLoading(true);
        try {
            const buyerMappings: BuyerMapping[] = preview.platform_buyers.map(b => ({
                platform_buyer_id: b.platform_buyer_id,
                automator_buyer_id: mappings[b.platform_buyer_id] ?? null,
            }));

            const res = await reconciliationService.confirmImport(preview.file_token, buyerMappings);
            setResult(res);
            setStep('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setStep('upload');
        setPreview(null);
        setMappings({});
        setResult(null);
        setError(null);
    };

    return (
        <Box sx={{ p: 3, maxWidth: 860 }}>
            <Typography variant="h5" fontWeight={600} mb={3}>
                Reconciliation Import
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* ── Step 1: Upload ── */}
            {step === 'upload' && (
                <Paper variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Upload a CSV exported from Metabase. The file will be parsed and you'll match each buyer to an Automator buyer before importing.
                    </Typography>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <Button
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
                        disabled={loading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {loading ? 'Parsing...' : 'Upload file'}
                    </Button>
                </Paper>
            )}

            {/* ── Step 2: Map buyers ── */}
            {step === 'map_buyers' && preview && (
                <Paper variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={500} mb={0.5}>
                        Who are these buyers?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        {preview.row_count} rows found. Match each buyer in this file to an Automator buyer — this is saved for next time.
                    </Typography>

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Buyer in file</TableCell>
                                <TableCell>Rows</TableCell>
                                <TableCell sx={{ minWidth: 220 }}>Automator buyer</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {preview.platform_buyers.map((buyer: PlatformBuyerSummary) => (
                                <TableRow key={buyer.platform_buyer_id}>
                                    <TableCell>
                                        <Typography variant="body2">{buyer.platform_buyer_name ?? '—'}</Typography>
                                        <Typography variant="caption" color="text.secondary">{buyer.platform_buyer_email ?? ''}</Typography>
                                    </TableCell>
                                    <TableCell>{buyer.row_count}</TableCell>
                                    <TableCell>
                                        <FormControl fullWidth size="small">
                                            <Select
                                                value={mappings[buyer.platform_buyer_id] ?? ''}
                                                displayEmpty
                                                onChange={e => setMappings(prev => ({
                                                    ...prev,
                                                    [buyer.platform_buyer_id]: e.target.value || null,
                                                }))}
                                            >
                                                <MenuItem value=""><em>Unknown / skip</em></MenuItem>
                                                {buyers.map(b => (
                                                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <Box display="flex" gap={1} mt={3}>
                        <Button variant="outlined" onClick={handleReset} disabled={loading}>
                            Back
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleConfirm}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
                        >
                            {loading ? 'Importing...' : `Import ${preview.row_count} rows`}
                        </Button>
                    </Box>
                </Paper>
            )}

            {/* ── Step 3: Done ── */}
            {step === 'done' && result && (
                <Paper variant="outlined" sx={{ p: 3 }}>
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Import complete — {result.row_count} rows upserted (batch #{result.batch_id})
                    </Alert>
                    <Button variant="outlined" onClick={handleReset}>
                        Import another file
                    </Button>
                </Paper>
            )}
        </Box>
    );
}
