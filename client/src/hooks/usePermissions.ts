import { useCallback, useContext, useMemo } from 'react';
import DataContext from '../context/DataContext';
import { Permission } from '../types/userTypes';

export function usePermissions() {
    const { loggedInUser } = useContext(DataContext);
    const permissions = useMemo(
        () => loggedInUser?.permissions ?? [],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [loggedInUser]
    );
    const can = useCallback(
        (permission: Permission) => permissions.includes(permission),
        [permissions]
    );

    return { can, permissions };
}
