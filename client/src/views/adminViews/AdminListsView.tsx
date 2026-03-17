import { Accordion, AccordionDetails, AccordionSummary, Container, Typography } from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { usePermissions } from "../../hooks/usePermissions";
import { Permission } from "../../types/userTypes";
import AdminCallRequestReasonsSection from "../../components/admin/adminCallRequestReasonsSection/AdminCallRequestReasonsSection";
import AdminTrashReasonsSection from "../../components/admin/adminTrashReasonsSection/AdminTrashReasonsSection";
import AdminCallOutcomesSection from "../../components/admin/adminCallOutcomesSection/AdminCallOutcomesSection";

export default function AdminListsView() {
    const { can } = usePermissions();

    return (
        <Container maxWidth="md" sx={{ py: 3 }}>
            <Typography variant="h5" fontWeight={700} mb={3}>
                Managed Lists
            </Typography>

            {can(Permission.CALL_REQUEST_REASONS_MANAGE) && (
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography fontWeight={600}>Call Request Reasons</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <AdminCallRequestReasonsSection embedded />
                    </AccordionDetails>
                </Accordion>
            )}

            {can(Permission.TRASH_REASONS_MANAGE) && (
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography fontWeight={600}>Trash Reasons</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <AdminTrashReasonsSection embedded />
                    </AccordionDetails>
                </Accordion>
            )}

            {can(Permission.CALL_OUTCOMES_MANAGE) && (
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography fontWeight={600}>Call Outcomes</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <AdminCallOutcomesSection embedded />
                    </AccordionDetails>
                </Accordion>
            )}
        </Container>
    );
}
