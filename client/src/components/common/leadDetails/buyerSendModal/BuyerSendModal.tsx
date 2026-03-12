import { useState, useEffect, useCallback } from 'react';
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
    dispatch_mode: 'manual' | 'worker' | 'both';
    sold: boolean;
    has_successful_send: boolean;
    sends: Array<{
        id: string;
        status: string;
        response_code: number | null;
        created: string;
    }>;
    total_sends: number;
    last_sent_at: string | null;
}

function extractErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof Error) return err.message;
    return fallback;
}

const BuyerSendModal = ({ open, onClose, lead, onRefresh }: BuyerSendModalProps) => {
    const [loading, setLoading] = useState(false);
    const [buyerHistory, setBuyerHistory] = useState<BuyerHistory[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState<string | null>(null); // buyer_id currently being sent to
    const [enablingWorker, setEnablingWorker] = useState(false);

    const loadBuyerHistory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await leadsService.getBuyerSendHistory(lead.id);
            setBuyerHistory(data.buyers);
        } catch (err: unknown) {
            setError(extractErrorMessage(err, 'Failed to load buyer history'));
        } finally {
            setLoading(false);
        }
    }, [lead.id]);

    useEffect(() => {
        if (open) {
            void loadBuyerHistory();
        }
    }, [open, loadBuyerHistory]);

    const handleSendToBuyer = async (buyerId: string) => {
        setSending(buyerId);
        setError(null);
        try {
            await leadsService.sendLeadToBuyer(lead.id, buyerId);
            await loadBuyerHistory();
            if (onRefresh) onRefresh();
        } catch (err: unknown) {
            setError(extractErrorMessage(err, 'Failed to send lead'));
        } finally {
            setSending(null);
        }
    };

    const handleMarkSold = async (buyerId: string, sold: boolean) => {
        setError(null);
        try {
            if (sold) {
                await leadsService.markSoldToBuyer(lead.id, buyerId);
            } else {
                await leadsService.unmarkSoldToBuyer(lead.id, buyerId);
            }
            await loadBuyerHistory();
            if (onRefresh) onRefresh();
        } catch (err: unknown) {
            setError(extractErrorMessage(err, sold ? 'Failed to mark as sold' : 'Failed to unmark as sold'));
        }
    };

    const handleEnableWorker = async () => {
        setEnablingWorker(true);
        setError(null);
        try {
            await leadsService.enableWorker(lead.id);
            if (onRefresh) onRefresh();
            onClose();
        } catch (err: unknown) {
            setError(extractErrorMessage(err, 'Failed to queue for worker'));
        } finally {
            setEnablingWorker(false);
        }
    };

    const handleClearError = () => { setError(null); };

    // Manual buyers: dispatch_mode is 'manual' or 'both'
    const manualBuyers = buyerHistory.filter(b =>
        b.dispatch_mode === 'manual' || b.dispatch_mode === 'both'
    );

    // Worker buyers: dispatch_mode is 'worker' or 'both'
    const workerBuyers = buyerHistory.filter(b =>
        b.dispatch_mode === 'worker' || b.dispatch_mode === 'both'
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
                                {wasSuccessful
                                    ? (
                                        <Chip
                                            icon={<CheckCircleIcon />}
                                            label={`Success (${latestSend.response_code})`}
                                            color="success"
                                            size="small"
                                        />
                                    )
                                    : (
                                        <Chip
                                            icon={<ErrorIcon />}
                                            label={`Failed (${latestSend.response_code ?? 'Error'})`}
                                            color="error"
                                            size="small"
                                        />
                                    )
                                }
                            </Box>
                        )}
                    </Box>

                    {/* Right: Actions */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        {!isWorkerBuyer && (
                            <>
                                <Tooltip title={!buyer.has_successful_send ? 'No successful send yet' : ''}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={buyer.sold}
                                                onChange={(e) => { void handleMarkSold(buyer.buyer_id, e.target.checked); }}
                                                disabled={sending !== null || !buyer.has_successful_send}
                                            />
                                        }
                                        label="Sold"
                                    />
                                </Tooltip>
                                <Button
                                    variant="contained"
                                    startIcon={sending === buyer.buyer_id ? <CircularProgress size={16} /> : <SendIcon />}
                                    onClick={() => { void handleSendToBuyer(buyer.buyer_id); }}
                                    disabled={sending !== null || (!lead.verified && buyer.buyer_name.includes('validation'))}
                                    size="small"
                                >
                                    {sending === buyer.buyer_id ? 'Sending...' : 'Send'}
                                </Button>
                            </>
                        )}
                        {isWorkerBuyer && !lead.worker_enabled && (
                            <Tooltip title="Lead must be queued for worker to send to this buyer">
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
                    <Box>
                        <Typography variant="h6">Send Lead to Buyers</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {lead.first_name} {lead.last_name}
                            {lead.county ? ` · ${lead.county}, ${lead.state}` : ` · ${lead.state}`}
                            {lead.phone ? ` · ${lead.phone}` : ''}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={handleClearError}>
                        {error}
                    </Alert>
                )}

                {loading
                    ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    )
                    : (
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
                    )
                }
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                {!lead.worker_enabled && (
                    <Button
                        variant="outlined"
                        startIcon={enablingWorker ? <CircularProgress size={16} /> : <PlayArrowIcon />}
                        onClick={() => { void handleEnableWorker(); }}
                        disabled={enablingWorker || sending !== null}
                        color="primary"
                    >
                        {enablingWorker ? 'Queuing...' : 'Queue for Worker'}
                    </Button>
                )}
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default BuyerSendModal;
