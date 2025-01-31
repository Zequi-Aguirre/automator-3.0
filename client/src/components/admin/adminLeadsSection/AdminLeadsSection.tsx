import {useContext, useEffect, useState} from 'react';
import LeadsService from "../../../services/lead.service";
import AdminLeadsTable from "./adminLeadsTable/AdminLeadsTable.tsx";
import CustomPagination from "../../Pagination";
import {
    Box,
    Typography,
    CircularProgress,
    Container,
    Switch,
    FormControlLabel
} from "@mui/material";
import { Lead } from "../../../types/leadTypes.ts";
import DataContext from "../../../context/DataContext.tsx";

const AdminLeadsSection = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [page, setPage] = useState(1);
    const [leadCount, setLeadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState(50);
    const { oldDatabase, setOldDatabase } = useContext(DataContext);
    const { role } = useContext(DataContext);

    useEffect(() => {
        LeadsService.getMany({ page, limit, oldDatabase }).then((response) => {
            setLeads(response.leads);
            setLeadCount(response.count);
            setLoading(false);
        });
    }, [page, limit, oldDatabase]);

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
                    {
                        role === 'superadmin' && (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={oldDatabase}
                                        onChange={(e) => setOldDatabase(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Old Database"
                            />
                        )
                    }
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
                                    oldDatabase={oldDatabase}
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