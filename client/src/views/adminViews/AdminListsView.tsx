import { useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Chip, Container, Stack, Typography } from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { usePermissions } from "../../hooks/usePermissions";
import { Permission } from "../../types/userTypes";
import AdminCallRequestReasonsSection from "../../components/admin/adminCallRequestReasonsSection/AdminCallRequestReasonsSection";
import AdminTrashReasonsSection from "../../components/admin/adminTrashReasonsSection/AdminTrashReasonsSection";
import AdminCallOutcomesSection from "../../components/admin/adminCallOutcomesSection/AdminCallOutcomesSection";

export default function AdminListsView() {
    const { can } = usePermissions();
    const [callRequestCount, setCallRequestCount] = useState<number | null>(null);
    const [trashCount, setTrashCount] = useState<number | null>(null);
    const [callOutcomeCount, setCallOutcomeCount] = useState<number | null>(null);

    return (
        <Container maxWidth="md" sx={{ py: 3 }}>
            <Typography variant="h5" fontWeight={700} mb={3}>
                Managed Lists
            </Typography>

            {can(Permission.CALL_REQUEST_REASONS_MANAGE) && (
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Stack direction="row" alignItems="center" gap={1.5}>
                            <Typography fontWeight={600}>Call Request Reasons</Typography>
                            {callRequestCount !== null && (
                                <Chip label={callRequestCount} size="small" variant="outlined" />
                            )}
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                        <AdminCallRequestReasonsSection embedded onCountChange={setCallRequestCount} />
                    </AccordionDetails>
                </Accordion>
            )}

            {can(Permission.TRASH_REASONS_MANAGE) && (
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Stack direction="row" alignItems="center" gap={1.5}>
                            <Typography fontWeight={600}>Trash Reasons</Typography>
                            {trashCount !== null && (
                                <Chip label={trashCount} size="small" variant="outlined" />
                            )}
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                        <AdminTrashReasonsSection embedded onCountChange={setTrashCount} />
                    </AccordionDetails>
                </Accordion>
            )}

            {can(Permission.CALL_OUTCOMES_MANAGE) && (
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Stack direction="row" alignItems="center" gap={1.5}>
                            <Typography fontWeight={600}>Call Outcomes</Typography>
                            {callOutcomeCount !== null && (
                                <Chip label={callOutcomeCount} size="small" variant="outlined" />
                            )}
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                        <AdminCallOutcomesSection embedded onCountChange={setCallOutcomeCount} />
                    </AccordionDetails>
                </Accordion>
            )}
        </Container>
    );
}
