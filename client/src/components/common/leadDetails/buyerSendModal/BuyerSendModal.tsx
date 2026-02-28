import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Divider,
    Alert,
    CircularProgress,
    Chip,
    IconButton,
    Tooltip,
    Switch,
    FormControlLabel,
    Stack,
    Paper
} from '@mui/material';
import {
    Send as SendIcon,
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import leadsService from '../../../../services/lead.service';
import { Lead } from '../../../../types/leadTypes';

interface BuyerSendModalProps {
    open: boolean;
    onClose: () => void;
    lead: Lead;
    onRefresh?: () => void;
}

interface BuyerHistory {
    buyer_id: string;
    buyer_name: string;
    buyer_priority: number;
    sends: Array<{
        id: string;
        status: string;
        response_code: number | null;
        created: string;
    }>;
    total_sends: number;
    last_sent_at: string | null;
}

const BuyerSendModal = ({ open, onClose, lead, onRefresh }: BuyerSendModalProps) => {
    const [loading, setLoading] = useState(false);
    const [buyerHistory, setBuyerHistory] = useState<BuyerHistory[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState<string | null>(null); // buyer_id currently being sent to
    const [enablingWorker, setEnablingWorker] = useState(false);

    useEffect(() => {
        if (open) {
            loadBuyerHistory();
        }
    }, [open, lead.id]);

    const loadBuyerHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await leadsService.getBuyerSendHistory(lead.id);
            setBuyerHistory(data.buyers);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to load buyer history');
        } finally {
            setLoading(false);
        }
    };

    const handleSendToBuyer = async (buyerId: string) => {
        setSending(buyerId);
        setError(null);
        try {
            await leadsService.sendLeadToBuyer(lead.id, buyerId);
            await loadBuyerHistory(); // Refresh history
            if (onRefresh) onRefresh();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to send lead');
        } finally {
            setSending(null);
        }
    };

    const handleMarkSold = async (buyerId: string, sold: boolean) => {
        if (!sold) return; // Only handle marking as sold, not unsold

        setError(null);
        try {
            await leadsService.markSoldToBuyer(lead.id, buyerId);
            await loadBuyerHistory(); // Refresh history
            if (onRefresh) onRefresh();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to mark as sold');
        }
    };

    const handleEnableWorker = async () => {
        setEnablingWorker(true);
        setError(null);
        try {
            await leadsService.enableWorker(lead.id);
            if (onRefresh) onRefresh();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to enable worker');
        } finally {
            setEnablingWorker(false);
        }
    };

    const manualBuyers = buyerHistory.filter(b =>
        b.buyer_name && !b.buyer_name.toLowerCase().includes('ispeed')
    );

    const workerBuyers = buyerHistory.filter(b =>
        b.buyer_name && b.buyer_name.toLowerCase().includes('ispeed')
    );

    const renderBuyerRow = (buyer: BuyerHistory, isWorkerBuyer: boolean) => {
        const latestSend = buyer.sends[0];
        const wasSuccessful = latestSend && latestSend.status === 'sent' &&
            latestSend.response_code && latestSend.response_code >= 200 &&
            latestSend.response_code < 300;

        return (
            <Paper key={buyer.buyer_id} elevation={1} sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    {/* Left: Buyer Info */}
                    <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                            {buyer.buyer_name}
                            <Chip
                                label={`Priority ${buyer.buyer_priority}`}
                                size="small"
                                sx={{ ml: 1 }}
                            />
                        </Typography>
                        {buyer.total_sends > 0 && (
                            <Typography variant="caption" color="text.secondary">
                                Sent {buyer.total_sends} time{buyer.total_sends > 1 ? 's' : ''}
                                {buyer.last_sent_at && ` • Last: ${new Date(buyer.last_sent_at).toLocaleString()}`}
                            </Typography>
                        )}
                        {latestSend && (
                            <Box mt={1}>
                                {wasSuccessful ? (
                                    <Chip
                                        icon={<CheckCircleIcon />}
                                        label={`Success (${latestSend.response_code})`}
                                        color="success"
                                        size="small"
                                    />
                                ) : (
                                    <Chip
                                        icon={<ErrorIcon />}
                                        label={`Failed (${latestSend.response_code || 'Error'})`}
                                        color="error"
                                        size="small"
                                    />
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* Right: Actions */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        {!isWorkerBuyer && (
                            <>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={false} // TODO: Get sold status from lead_buyer_outcomes
                                            onChange={(e) => handleMarkSold(buyer.buyer_id, e.target.checked)}
                                            disabled={sending !== null}
                                        />
                                    }
                                    label="Sold"
                                />
                                <Button
                                    variant="contained"
                                    startIcon={sending === buyer.buyer_id ? <CircularProgress size={16} /> : <SendIcon />}
                                    onClick={() => handleSendToBuyer(buyer.buyer_id)}
                                    disabled={sending !== null || (!lead.verified && buyer.buyer_name.includes('validation'))}
                                    size="small"
                                >
                                    {sending === buyer.buyer_id ? 'Sending...' : 'Send'}
                                </Button>
                            </>
                        )}
                        {isWorkerBuyer && !lead.worker_enabled && (
                            <Tooltip title="Enable worker to send to this buyer">
                                <Chip label="Worker Only" color="warning" size="small" />
                            </Tooltip>
                        )}
                    </Stack>
                </Stack>
            </Paper>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">Send Lead to Buyers</Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {/* Manual Buyers Section */}
                        {manualBuyers.length > 0 && (
                            <Box mb={3}>
                                <Typography variant="h6" gutterBottom>
                                    Manual Buyers
                                </Typography>
                                <Typography variant="caption" color="text.secondary" paragraph>
                                    Send leads manually to these buyers
                                </Typography>
                                {manualBuyers.map(buyer => renderBuyerRow(buyer, false))}
                            </Box>
                        )}

                        {manualBuyers.length > 0 && workerBuyers.length > 0 && <Divider sx={{ my: 3 }} />}

                        {/* Worker Buyers Section */}
                        {workerBuyers.length > 0 && (
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    Worker Buyers (Automated)
                                </Typography>
                                <Typography variant="caption" color="text.secondary" paragraph>
                                    These buyers receive leads automatically when worker is enabled
                                </Typography>
                                {workerBuyers.map(buyer => renderBuyerRow(buyer, true))}
                            </Box>
                        )}

                        {buyerHistory.length === 0 && (
                            <Alert severity="info">
                                No buyers configured. Add buyers in the admin panel.
                            </Alert>
                        )}
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                {!lead.worker_enabled && (
                    <Button
                        variant="outlined"
                        startIcon={enablingWorker ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                        onClick={handleEnableWorker}
                        disabled={enablingWorker || sending !== null}
                        color="primary"
                    >
                        {enablingWorker ? 'Enabling...' : 'Enable Worker'}
                    </Button>
                )}
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default BuyerSendModal;
