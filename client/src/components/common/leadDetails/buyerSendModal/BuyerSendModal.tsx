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
    Paper,
    TextField
} from '@mui/material';
import {
    Send as SendIcon,
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    PlayArrow as PlayArrowIcon,
    Flag as FlagIcon,
    FlagOutlined as FlagOutlinedIcon
} from '@mui/icons-material';
import leadsService from '../../../../services/lead.service';
import sendLogService from '../../../../services/sendLog.service';
import { Lead } from '../../../../types/leadTypes';
import { usePermissions } from '../../../../hooks/usePermissions';
import { Permission } from '../../../../types/userTypes';

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
        disputed: boolean;
        dispute_reason: string | null;
        dispute_buyer_name: string | null;
        disputed_at: string | null;
    }>;
    total_sends: number;
    last_sent_at: string | null;
}

function extractErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof Error) return err.message;
    return fallback;
}

const BuyerSendModal = ({ open, onClose, lead, onRefresh }: BuyerSendModalProps) => {
    const { can } = usePermissions();
    const canSend = can(Permission.LEADS_SEND);
    const canQueue = can(Permission.LEADS_QUEUE);
    const canDispute = can(Permission.DISPUTES_CREATE);
    const [loading, setLoading] = useState(false);
    const [buyerHistory, setBuyerHistory] = useState<BuyerHistory[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState<string | null>(null);
    const [enablingWorker, setEnablingWorker] = useState(false);

    // Dispute dialog state
    const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
    const [disputeTargetId, setDisputeTargetId] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputeBuyerName, setDisputeBuyerName] = useState('');
    const [disputing, setDisputing] = useState(false);

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
            await leadsService.queueLead(lead.id);
            if (onRefresh) onRefresh();
            onClose();
        } catch (err: unknown) {
            setError(extractErrorMessage(err, 'Failed to queue for worker'));
        } finally {
            setEnablingWorker(false);
        }
    };

    const openDisputeDialog = (sendId: string) => {
        setDisputeTargetId(sendId);
        setDisputeReason('');
        setDisputeBuyerName('');
        setDisputeDialogOpen(true);
    };

    const handleDisputeSubmit = async () => {
        if (!disputeTargetId || !disputeReason.trim()) return;
        setDisputing(true);
        try {
            await sendLogService.disputeLog(disputeTargetId, disputeReason.trim(), disputeBuyerName.trim() || undefined);
            setDisputeDialogOpen(false);
            await loadBuyerHistory();
        } catch (err: unknown) {
            setError(extractErrorMessage(err, 'Failed to dispute send'));
        } finally {
            setDisputing(false);
        }
    };

    const handleUndispute = async (sendId: string) => {
        setError(null);
        try {
            await sendLogService.undisputeLog(sendId);
            await loadBuyerHistory();
        } catch (err: unknown) {
            setError(extractErrorMessage(err, 'Failed to remove dispute'));
        }
    };

    const handleClearError = () => { setError(null); };

    const manualBuyers = buyerHistory.filter(b =>
        b.dispatch_mode === 'manual' || b.dispatch_mode === 'both'
    );

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
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
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
                                    {latestSend.disputed && (
                                        <Tooltip title={
                                            [
                                                latestSend.dispute_buyer_name ? `Buyer: ${latestSend.dispute_buyer_name}` : null,
                                                latestSend.dispute_reason ? `Reason: ${latestSend.dispute_reason}` : null,
                                            ].filter(Boolean).join(' · ') || 'Disputed'
                                        }>
                                            <Chip
                                                icon={<FlagIcon />}
                                                label="Disputed"
                                                color="warning"
                                                size="small"
                                            />
                                        </Tooltip>
                                    )}
                                </Stack>
                            </Box>
                        )}
                    </Box>

                    {/* Right: Actions */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        {latestSend && canDispute && (
                            latestSend.disputed
                                ? (
                                    <Button
                                        size="small"
                                        color="warning"
                                        variant="outlined"
                                        onClick={() => { void handleUndispute(latestSend.id); }}
                                    >
                                        Undo Dispute
                                    </Button>
                                )
                                : (
                                    <Tooltip title="Flag this send as disputed">
                                        <IconButton
                                            size="small"
                                            color="default"
                                            onClick={() => { openDisputeDialog(latestSend.id); }}
                                        >
                                            <FlagOutlinedIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )
                        )}
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
                                    disabled={!canSend || sending !== null || (!lead.verified && buyer.buyer_name.includes('validation'))}
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
        <>
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
                            disabled={!canQueue || enablingWorker || sending !== null}
                            color="primary"
                        >
                            {enablingWorker ? 'Queuing...' : 'Queue for Worker'}
                        </Button>
                    )}
                    <Button onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Dispute Dialog */}
            <Dialog open={disputeDialogOpen} onClose={() => { setDisputeDialogOpen(false); }} maxWidth="sm" fullWidth>
                <DialogTitle>Dispute Send</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Their buyer name (optional)"
                            placeholder="e.g. John Smith"
                            value={disputeBuyerName}
                            onChange={(e) => { setDisputeBuyerName(e.target.value); }}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label="Dispute reason"
                            placeholder="Describe the dispute..."
                            value={disputeReason}
                            onChange={(e) => { setDisputeReason(e.target.value); }}
                            size="small"
                            fullWidth
                            multiline
                            rows={3}
                            required
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setDisputeDialogOpen(false); }} disabled={disputing}>Cancel</Button>
                    <Button
                        onClick={() => { void handleDisputeSubmit(); }}
                        variant="contained"
                        color="warning"
                        disabled={disputing || !disputeReason.trim()}
                        startIcon={disputing ? <CircularProgress size={16} /> : <FlagIcon />}
                    >
                        {disputing ? 'Submitting...' : 'Mark as Disputed'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default BuyerSendModal;
