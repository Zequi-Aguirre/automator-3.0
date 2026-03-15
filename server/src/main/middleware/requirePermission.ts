import { Request, Response, NextFunction } from 'express';
import { Permission } from '../types/permissionTypes';

export function requirePermission(permission: Permission) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.user?.role === 'superadmin') {
            return next();
        }
        if (!req.user?.permissions?.includes(permission)) {
            return res.sendStatus(403);
        }
        next();
    };
}
