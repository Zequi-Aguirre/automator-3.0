import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import UserService from "../services/userService.ts";
import { requirePermission } from '../middleware/requirePermission';
import { Permission, UserRole } from '../types/permissionTypes';

@injectable()
export default class UserResource {

    private readonly router: Router;

    constructor(private readonly userService: UserService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Current user info + permissions
        this.router.get('/info', async (req: Request, res: Response) => {
            const response = await this.userService.getUserById(req.user.id);
            res.status(200).json(response);
        });

        // List all users (requires users.manage)
        this.router.get('/admin/users', requirePermission(Permission.USERS_MANAGE), async (_req: Request, res: Response) => {
            const users = await this.userService.getAllUsers();
            res.status(200).json(users);
        });

        // Update a user's role (requires users.manage; superadmin-only logic enforced in service)
        this.router.patch('/admin/users/:id/role', requirePermission(Permission.USERS_MANAGE), async (req: Request, res: Response) => {
            const { role } = req.body;
            if (!['user', 'admin'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role. Must be user or admin.' });
            }
            const updated = await this.userService.updateUserRole(req.params.id, role, req.user.role as UserRole);
            if (!updated) {
                return res.status(403).json({ message: 'Cannot update this user\'s role.' });
            }
            res.status(200).json(updated);
        });
    }

    public routes(): Router {
        return this.router;
    }
}