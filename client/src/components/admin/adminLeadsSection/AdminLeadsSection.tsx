import {useEffect, useState} from 'react';
import LeadsService from "../../../services/lead.service";
import AdminLeadsTable from "./adminLeadsTable/AdminLeadsTable.tsx";
import CustomPagination from "../../Pagination";
import {
    Box,
    Typography,
    CircularProgress,
    Container,
} from "@mui/material";
import { Lead } from "../../../types/leadTypes.ts";

const AdminLeadsSection = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [page, setPage] = useState(1);
    const [leadCount, setLeadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState(100);

    useEffect(() => {
        LeadsService.getMany({ page, limit }).then((response) => {
            setLeads(response.leads);
            setLeadCount(response.count);
            setLoading(false);
        });
    }, [page, limit]);

    return (
        <Container maxWidth={false} sx={{height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: 0}}>
            <Box sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden'
            }}>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3
                }}>
                    <Typography variant="h4" component="h2" sx={{fontWeight: 'bold'}}>
                        Leads
                    </Typography>
                </Box>

                {loading
                    ? (
                        <Box sx={{display: 'flex', justifyContent: 'center', p: 4}}>
                            <CircularProgress/>
                        </Box>
                    )
                    : (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            overflow: 'hidden'
                        }}>
                            <Box sx={{
                                flexGrow: 1,
                                overflow: 'auto',
                                minHeight: 0
                            }}>
                                <AdminLeadsTable
                                    leads={leads}
                                    setLeads={setLeads}
                                />
                            </Box>
                            <Box sx={{
                                backgroundColor: 'background.paper'
                            }}>
                                <CustomPagination
                                    page={page}
                                    setPage={setPage}
                                    rows={leadCount}
                                    limit={limit}
                                    setLimit={setLimit}
                                />
                            </Box>
                        </Box>
                    )}
            </Box>
        </Container>
    );
};

export default AdminLeadsSection;