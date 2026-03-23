import { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    LinearProgress,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import LeadsService from '../../../../services/lead.service';
import SourceService from '../../../../services/source.service';
import { Source } from '../../../../types/sourceTypes';

type RejectedRow = Record<string, string>;

type ImportResult = {
    imported: number;
    rejected: number;
    rejectedLeads: RejectedRow[];
};

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: (summary: { imported?: number; rejected?: number }) => void;
};

function buildCsv(rows: RejectedRow[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
        headers.map(escape).join(','),
        ...rows.map(r => headers.map(h => escape(r[h] ?? '')).join(','))
    ];
    return lines.join('\n');
}

function downloadCsv(rows: RejectedRow[], filename: string) {
    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export default function ImportLeadsDialog({ open, onClose, onSuccess }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [sources, setSources] = useState<Source[]>([]);
    const [selectedSourceId, setSelectedSourceId] = useState<string>('');
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) return;
        SourceService.getAll({ page: 1, limit: 100 })
            .then(res => { setSources(res.items.filter(s => !s.deleted)); })
            .catch(() => { /* sources optional — fall back to default */ });
    }, [open]);

    const reset = () => {
        setFile(null);
        setBusy(false);
        setError(null);
        setResult(null);
        setSelectedSourceId('');
        if (inputRef.current && 'value' in inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const handleClose = () => {
        if (busy) return;
        reset();
        onClose();
    };

    const handleFile = (f: File | null) => {
        setError(null);
        if (!f) { setFile(null); return; }
        if (!f.name.toLowerCase().endsWith('.csv')) {
            setError('Please select a .csv file.');
            setFile(null);
            return;
        }
        setFile(f);
    };

    const handleImport = async () => {
        if (!file) { setError('Choose a CSV file first.'); return; }
        setBusy(true);
        setError(null);
        const form = new FormData();
        form.append('file', file, file.name);
        if (selectedSourceId) form.append('source_id', selectedSourceId);

        try {
            const res = await LeadsService.importLeads(form);
            const imported = res?.imported ?? 0;
            const rejected = res?.rejected ?? 0;
            const rejectedLeads = (res?.rejectedLeads as RejectedRow[] | undefined) ?? [];
            onSuccess({ imported, rejected });
            setResult({ imported, rejected, rejectedLeads });
            setBusy(false);
        } catch (err: unknown) {
            setBusy(false);
            const typed = err as { response?: { data?: { message?: string } }; message?: string };
            const msg = typed?.response?.data?.message ??
                typed?.message ??
                'Failed to import CSV. Please check the file format and try again.';
            setError(msg);
        }
    };

    // ── Done state ───────────────────────────────────────────────────────────
    if (result) {
        return (
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                <DialogTitle>Import complete</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="body1">
                            <strong>{result.imported}</strong> lead{result.imported === 1 ? '' : 's'} imported
                            {result.rejected > 0 && (
                                <>, <strong style={{ color: '#D32F2F' }}>{result.rejected}</strong> rejected</>
                            )}
                        </Typography>
                        {result.rejected > 0 && result.rejectedLeads.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Download a CSV of rejected leads with rejection reasons:
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DownloadIcon />}
                                    onClick={() => { downloadCsv(result.rejectedLeads, 'rejected_leads.csv'); }}
                                >
                                    Download ({result.rejected})
                                </Button>
                            </Box>
                        )}
                        {result.rejected > 0 && result.rejectedLeads.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                Rejected leads data not available for download.
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" onClick={handleClose}>Close</Button>
                </DialogActions>
            </Dialog>
        );
    }

    // ── Upload state ─────────────────────────────────────────────────────────
    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>Import leads (CSV)</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sources.length > 0 && (
                        <FormControl fullWidth size="small">
                            <InputLabel id="import-source-label">Source</InputLabel>
                            <Select
                                labelId="import-source-label"
                                label="Source"
                                value={selectedSourceId}
                                onChange={(e) => { setSelectedSourceId(e.target.value); }}
                            >
                                <MenuItem value=""><em>Default (CSV Import)</em></MenuItem>
                                {sources.map(s => (
                                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => { handleFile(e.target.files?.[0] ?? null); }}
                    />
                    {file && (
                        <Typography variant="body2">
                            Selected: <strong>{file.name}</strong> ({Math.ceil(file.size / 1024)} KB)
                        </Typography>
                    )}
                    {busy && <LinearProgress aria-label="Uploading..." />}
                    {error && (
                        <Typography variant="body2" color="error">
                            {error}
                        </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                        The file will be uploaded to the server for processing. Filtering and duplicate checks happen on
                        the backend.
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={busy}>Cancel</Button>
                <Button variant="contained" onClick={() => { void handleImport(); }} disabled={!file || busy}>
                    Import
                </Button>
            </DialogActions>
        </Dialog>
    );
}
