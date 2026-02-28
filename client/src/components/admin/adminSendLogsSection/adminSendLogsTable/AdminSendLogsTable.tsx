import { Box, Typography, Chip } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {SendLog} from "../../../../types/sendLogTypes.ts";

interface Props {
    logs: SendLog[];
    setLogs: (fn: (prev: SendLog[]) => SendLog[]) => void;
}

const shortenId = (id: string | null) => {
    if (!id) return "—";
    return `${id.slice(0, 8)}...${id.slice(-4)}`;
};

const formatDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString();
};

const AdminSendLogsTable = ({ logs }: Props) => {
    const columns: GridColDef[] = [
        {
            field: "status",
            headerName: "Status",
            minWidth: 140,
            renderCell: (params) => {
                const s = params.row.status as SendLog["status"];
                return (
                    <Chip
                        label={s === "sent" ? "Sent" : "Failed"}
                        color={s === "sent" ? "success" : "error" as "success" | "error"}
                        size="small"
                    />
                );
            },
        },
        {
            field: "response_code",
            headerName: "Resp. Code",
            minWidth: 120,
            renderCell: (params) => {
                return (
                    <Typography sx={{ fontWeight: 500 }}>
                        {params.row.response_code ?? "—"}
                    </Typography>
                );
            },
        },
        {
            field: "created",
            headerName: "Created",
            minWidth: 220,
            renderCell: (params) => {
                return (
                    <Typography sx={{ fontWeight: 500 }}>
                        {formatDate(params.row.created)}
                    </Typography>
                );
            },
        },
        {
            field: "lead_id",
            headerName: "Lead",
            minWidth: 160,
            renderCell: (params) => {
                return <Typography>{shortenId(params.row.lead_id)}</Typography>;
            },
        },
        {
            field: "affiliate_id",
            headerName: "Affiliate",
            minWidth: 160,
            renderCell: (params) => {
                return <Typography>{shortenId(params.row.affiliate_id)}</Typography>;
            },
        },
        {
            field: "campaign_id",
            headerName: "Campaign",
            minWidth: 160,
            renderCell: (params) => {
                return <Typography>{shortenId(params.row.campaign_id)}</Typography>;
            },
        },
        {
            field: "county_id",
            headerName: "County",
            minWidth: 160,
            renderCell: (params) => {
                return <Typography>{shortenId(params.row.county_id)}</Typography>;
            },
        },
        {
            field: "response_body",
            headerName: "Response Body",
            flex: 1,
            minWidth: 280,
            renderCell: (params) => {
                const body = params.row.response_body;
                return (
                    <Typography
                        sx={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "100%",
                        }}
                        title={body ?? ""}
                    >
                        {body ?? "—"}
                    </Typography>
                );
            },
        },
    ];

    return (
        <Box>
            <DataGrid
                rows={logs}
                columns={columns}
                disableRowSelectionOnClick
                hideFooter
                getRowId={(row) => {
                    return row.id;
                }}
                sx={{
                    "& .MuiDataGrid-cell": { py: 2 },
                    "& .MuiDataGrid-columnHeaders": { backgroundColor: "action.hover" },
                }}
            />
        </Box>
    );
};

export default AdminSendLogsTable;