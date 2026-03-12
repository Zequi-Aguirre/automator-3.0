import { Request, Response, NextFunction } from 'express';
import { Permission, UserRole, hasPermission } from '../types/permissionTypes';

export function requirePermission(permission: Permission) {
    return (req: Request, res: Response, next: NextFunction) => {
        const role = req.user?.role as UserRole | undefined;
        if (!role || !hasPermission(role, permission)) {
            return res.sendStatus(403);
        }
        next();
    };
}
