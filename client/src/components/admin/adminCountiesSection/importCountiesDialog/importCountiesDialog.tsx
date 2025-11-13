import {useState, useRef} from 'react';
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
import LeadsService from '../../../../services/lead.service';

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: (summary: { imported?: number; rejected?: number; errors?: string[] }) => void;
};

export default function ImportCountiesDialog({open, onClose, onSuccess}: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const reset = () => {
        setFile(null);
        setBusy(false);
        setError(null);
        if (inputRef.current) {
            if ("value" in inputRef.current) {
                inputRef.current.value = '';
            }
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
        // basic guard: CSV only
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
        try {
            setBusy(true);
            setError(null);
            const form = new FormData();
            form.append('file', file, file.name);

            // Optional: include flags to let backend know to run filters immediately
            // form.append('applyFilters', 'true');

            const res = await LeadsService.importLeads(form);
            onSuccess({imported: res?.imported, rejected: res?.rejected, errors: res?.errors});
            reset();
            onClose();
        } catch (e: never) {
            setError(e?.message || 'Import failed');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>Import leads (CSV)</DialogTitle>
            <DialogContent>
                <Box sx={{mt: 1, display: 'flex', flexDirection: 'column', gap: 2}}>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    />
                    {file && (
                        <Typography variant="body2">
                            Selected: <strong>{file.name}</strong> ({Math.ceil(file.size / 1024)} KB)
                        </Typography>
                    )}
                    {busy && <LinearProgress aria-label="Uploading..."/>}
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
                <Button variant="contained" onClick={handleImport} disabled={!file || busy}>
                    Import
                </Button>
            </DialogActions>
        </Dialog>
    );
}