import { useState } from "react";
import {
    Typography,
    Chip,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Tooltip,
    Stack,
    Divider,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { SendLog } from "../../../../types/sendLogTypes.ts";

interface Props {
    logs: SendLog[];
    setLogs: (fn: (prev: SendLog[]) => SendLog[]) => void;
}

const formatDate = (iso: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
};

const formatCampaign = (platform: string | null | undefined, name: string | null | undefined) => {
    if (!name) return "—";
    if (!platform) return name;
    return `${platform.toUpperCase()} - ${name}`;
};

const DetailField = ({ label, value }: { label: string; value: string }) => (
    <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {label}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.25 }}>{value}</Typography>
    </Box>
);

const AdminSendLogsTable = ({ logs }: Props) => {
    const [selectedLog, setSelectedLog] = useState<SendLog | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!selectedLog?.response_body) return;
        void navigator.clipboard.writeText(selectedLog.response_body).then(() => {
            setCopied(true);
            setTimeout(() => { setCopied(false); }, 2000);
        });
    };

    const columns: GridColDef[] = [
        {
            field: "status",
            headerName: "Status",
            width: 110,
            renderCell: (params) => {
                const s = params.row.status as SendLog["status"];
                return (
                    <Chip
                        label={s === "sent" ? "Sent" : "Failed"}
                        color={s === "sent" ? "success" : "error"}
                        size="small"
                    />
                );
            },
        },
        {
            field: "response_code",
            headerName: "Code",
            width: 80,
            renderCell: (params) => (
                <Typography sx={{ fontWeight: 500 }}>
                    {params.row.response_code ?? "—"}
                </Typography>
            ),
        },
        {
            field: "lead_first_name",
            headerName: "Lead",
            minWidth: 180,
            flex: 1,
            renderCell: (params) => {
                const row = params.row as SendLog;
                const name = [row.lead_first_name, row.lead_last_name].filter(Boolean).join(" ") || "—";
                const county = row.lead_county ?? null;
                return (
                    <Stack spacing={0} sx={{ lineHeight: 1.2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{name}</Typography>
                        {county && (
                            <Typography variant="caption" color="text.secondary">{county}</Typography>
                        )}
                    </Stack>
                );
            },
        },
        {
            field: "campaign_name",
            headerName: "Campaign",
            minWidth: 200,
            flex: 1,
            renderCell: (params) => {
                const row = params.row as SendLog;
                return (
                    <Typography variant="body2">
                        {formatCampaign(row.campaign_platform, row.campaign_name)}
                    </Typography>
                );
            },
        },
        {
            field: "created",
            headerName: "Created",
            width: 180,
            renderCell: (params) => (
                <Typography variant="body2">{formatDate(params.row.created)}</Typography>
            ),
        },
        {
            field: "response_body",
            headerName: "Response",
            flex: 2,
            minWidth: 240,
            renderCell: (params) => {
                const body: string | null = params.row.response_body;
                return (
                    <Typography
                        variant="body2"
                        sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", color: "text.secondary" }}
                    >
                        {body ?? "—"}
                    </Typography>
                );
            },
        },
    ];

    return (
        <>
            <DataGrid
                rows={logs}
                columns={columns}
                disableRowSelectionOnClick
                hideFooter
                getRowId={(row) => row.id}
                onRowClick={(params) => { setSelectedLog(params.row as SendLog); }}
                sx={{
                    cursor: "pointer",
                    "& .MuiDataGrid-row:hover": { backgroundColor: "action.hover" },
                    "& .MuiDataGrid-cell": { py: 1 },
                    "& .MuiDataGrid-columnHeaders": { backgroundColor: "action.hover" },
                }}
            />

            <Dialog
                open={selectedLog !== null}
                onClose={() => { setSelectedLog(null); }}
                maxWidth="md"
                fullWidth
            >
                {selectedLog && (
                    <>
                        <DialogTitle>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography variant="h6">Log Detail</Typography>
                                <Chip
                                    label={selectedLog.status === "sent" ? "Sent" : "Failed"}
                                    color={selectedLog.status === "sent" ? "success" : "error"}
                                    size="small"
                                />
                            </Stack>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Stack spacing={2}>
                                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
                                    <DetailField
                                        label="Lead"
                                        value={[selectedLog.lead_first_name, selectedLog.lead_last_name].filter(Boolean).join(" ") || "—"}
                                    />
                                    <DetailField label="County" value={selectedLog.lead_county ?? "—"} />
                                    <DetailField label="Response Code" value={selectedLog.response_code?.toString() ?? "—"} />
                                    <DetailField
                                        label="Campaign"
                                        value={formatCampaign(selectedLog.campaign_platform, selectedLog.campaign_name)}
                                    />
                                    <DetailField label="Created" value={formatDate(selectedLog.created)} />
                                    <DetailField label="Lead ID" value={selectedLog.lead_id} />
                                </Box>

                                <Divider />

                                <Box>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                            Response Body
                                        </Typography>
                                        <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={handleCopy}
                                                    disabled={!selectedLog.response_body}
                                                >
                                                    <ContentCopyIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Stack>
                                    <Box
                                        sx={{
                                            p: 1.5,
                                            bgcolor: "action.hover",
                                            borderRadius: 1,
                                            fontFamily: "monospace",
                                            fontSize: "0.8rem",
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-all",
                                            maxHeight: 320,
                                            overflowY: "auto",
                                        }}
                                    >
                                        {selectedLog.response_body ?? "—"}
                                    </Box>
                                </Box>
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => { setSelectedLog(null); }}>Close</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </>
    );
};

export default AdminSendLogsTable;
