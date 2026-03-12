import { useContext } from 'react';
import DataContext from '../context/DataContext';
import { Permission } from '../types/userTypes';

export function usePermissions() {
    const { loggedInUser } = useContext(DataContext);
    const permissions = loggedInUser?.permissions ?? [];

    return {
        can: (permission: Permission) => permissions.includes(permission),
        permissions,
    };
}
