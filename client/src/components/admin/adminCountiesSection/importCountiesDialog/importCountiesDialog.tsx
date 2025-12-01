import { useState, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    LinearProgress
} from '@mui/material';
import countyService from '../../../../services/county.service';

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: (summary: { imported?: number; rejected?: number; errors?: string[] }) => void;
};

export default function ImportCountiesDialog({ open, onClose, onSuccess }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const reset = () => {
        setFile(null);
        setBusy(false);
        setError(null);
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
        if (!f) {
            setFile(null);
            return;
        }

        if (!f.name.toLowerCase().endsWith('.csv')) {
            setError('Please select a .csv file.');
            setFile(null);
            return;
        }

        setFile(f);
    };

    const handleImport = async () => {
        if (!file) {
            setError('Choose a CSV file first.');
            return;
        }

        setBusy(true);
        setError(null);

        const form = new FormData();
        form.append('file', file, file.name);

        try {
            const res = await countyService.import(form);
            console.log(`Imported ${res?.imported} counties, Rejected: ${res?.rejected}`);
            onSuccess({
                imported: res?.imported,
                rejected: res?.rejected,
                errors: res?.errors
            });
        } catch (err: any) {
            setError(err?.message || 'Failed to upload file');
            setBusy(false);
            return;
        }

        reset();
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>Import counties (CSV)</DialogTitle>

            <DialogContent>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                        Required columns: name, state.
                        Optional: population, timezone.
                        IDs will be ignored during import.
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={busy}>Cancel</Button>
                <Button variant="contained" onClick={handleImport} disabled={!file || busy}>
                    Import
                </Button>
            </DialogActions>
        </Dialog>
    );
}