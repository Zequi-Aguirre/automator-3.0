// TICKET-137: Reconciliation importer
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
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
    Platform,
    PlatformBuyerSummary,
    PreviewResult,
} from '../../services/reconciliation.service.tsx';
import buyerService from '../../services/buyer.service.tsx';
import { Buyer } from '../../types/buyerTypes';

const PLATFORMS: { value: Platform; label: string }[] = [
    { value: 'sellers', label: 'Sellers Direct' },
    { value: 'compass', label: 'Compass' },
    { value: 'pickle', label: 'Pickle Leads' },
];

type Step = 'upload' | 'map_buyers' | 'done';

export default function AdminReconciliationView() {
    const [platform, setPlatform] = useState<Platform>('sellers');
    const [step, setStep] = useState<Step>('upload');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Preview state
    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [mappings, setMappings] = useState<Record<string, string | null>>({});

    // Result state
    const [result, setResult] = useState<{ batch_id: number; row_count: number } | null>(null);

    // Buyers for dropdown
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
            const res = await reconciliationService.previewFile(platform, file);
            setPreview(res);

            // Pre-fill mappings from saved values
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

            const res = await reconciliationService.confirmImport(
                platform,
                preview.file_token,
                buyerMappings
            );
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
        <Box sx={{ p: 3, maxWidth: 900 }}>
            <Typography variant="h5" fontWeight={600} mb={3}>
                Platform Reconciliation Import
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* ── Step 1: Upload ── */}
            {step === 'upload' && (
                <Paper variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={500} mb={2}>
                        Upload Metabase CSV export
                    </Typography>

                    <FormControl size="small" sx={{ minWidth: 200, mb: 3 }}>
                        <InputLabel>Platform</InputLabel>
                        <Select
                            value={platform}
                            label="Platform"
                            onChange={e => setPlatform(e.target.value as Platform)}
                        >
                            {PLATFORMS.map(p => (
                                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box>
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
                            {loading ? 'Parsing...' : 'Select File'}
                        </Button>
                        <Typography variant="caption" display="block" color="text.secondary" mt={1}>
                            Accepts .csv, .xlsx, .xls — run the reconciliation query in Metabase first
                        </Typography>
                    </Box>
                </Paper>
            )}

            {/* ── Step 2: Map buyers ── */}
            {step === 'map_buyers' && preview && (
                <Paper variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={500} mb={0.5}>
                        Match platform buyers to Automator buyers
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        {preview.row_count} rows found. Map each platform buyer to an Automator buyer — this is saved for future imports.
                    </Typography>

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Platform buyer</TableCell>
                                <TableCell>Products</TableCell>
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
                                    <TableCell>
                                        <Typography variant="caption">{buyer.platform_buyer_products.join(', ') || '—'}</Typography>
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
