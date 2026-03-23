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
    Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useEffect, useRef, useState } from 'react';
import reconciliationService, { ImportResult } from '../../services/reconciliation.service.tsx';
import buyerService from '../../services/buyer.service.tsx';
import { Buyer } from '../../types/buyerTypes';

export default function AdminReconciliationView() {
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [buyerId, setBuyerId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        buyerService.getAll({ page: 1, limit: 200 }).then(r => setBuyers(r.items)).catch(() => {});
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setResult(null);
        setLoading(true);
        try {
            const res = await reconciliationService.importFile(buyerId, file);
            setResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 600 }}>
            <Typography variant="h5" fontWeight={600} mb={3}>
                Reconciliation Import
            </Typography>

            <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <FormControl size="small" fullWidth>
                    <InputLabel>Buyer</InputLabel>
                    <Select
                        value={buyerId}
                        label="Buyer"
                        onChange={e => { setBuyerId(e.target.value); setResult(null); setError(null); }}
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
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
                    disabled={!buyerId || loading}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ alignSelf: 'flex-start' }}
                >
                    {loading ? 'Importing...' : 'Upload & import'}
                </Button>

                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
                )}
                {result && (
                    <Alert severity="success">
                        Done — {result.row_count} rows imported (batch #{result.batch_id})
                    </Alert>
                )}
            </Paper>
        </Box>
    );
}
