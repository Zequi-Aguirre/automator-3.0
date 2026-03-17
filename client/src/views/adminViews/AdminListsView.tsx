import { Container, Divider, Typography } from "@mui/material";
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
                <>
                    <AdminCallRequestReasonsSection embedded />
                    <Divider sx={{ my: 4 }} />
                </>
            )}

            {can(Permission.TRASH_REASONS_MANAGE) && (
                <>
                    <AdminTrashReasonsSection embedded />
                    <Divider sx={{ my: 4 }} />
                </>
            )}

            {can(Permission.CALL_OUTCOMES_MANAGE) && (
                <>
                    <AdminCallOutcomesSection embedded />
                    <Divider sx={{ my: 4 }} />
                </>
            )}
        </Container>
    );
}
