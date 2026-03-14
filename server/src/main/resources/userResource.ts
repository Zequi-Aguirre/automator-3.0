import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import UserService from "../services/userService.ts";
import ActivityService from "../services/activityService";
import { requirePermission } from '../middleware/requirePermission';
import { Permission, UserRole, LeadPermission, WorkerPermission, SourcePermission, BuyerPermission, ManagerPermission, SettingsPermission, UserPermission, ActivityPermission } from '../types/permissionTypes';
import { EntityType, UserAction } from '../types/activityTypes';

@injectable()
export default class UserResource {

    private readonly router: Router;

    constructor(
        private readonly userService: UserService,
        private readonly activityService: ActivityService,
    ) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Current user info + permissions
        this.router.get('/info', async (req: Request, res: Response) => {
            const response = await this.userService.getUserById(req.user.id);
            res.status(200).json(response);
        });

        // List all users with their permissions
        this.router.get('/admin/users', requirePermission(UserPermission.MANAGE), async (_req: Request, res: Response) => {
            const users = await this.userService.getAllUsers();
            res.status(200).json(users);
        });

        // Get a single user by ID
        this.router.get('/admin/users/:id', requirePermission(UserPermission.MANAGE), async (req: Request, res: Response) => {
            const user = await this.userService.getUserById(req.params.id);
            if (!user) return res.status(404).json({ message: 'User not found' });
            res.status(200).json(user);
        });

        // Update a user's role
        this.router.patch('/admin/users/:id/role', requirePermission(UserPermission.MANAGE), async (req: Request, res: Response) => {
            const { role } = req.body;
            if (!['user', 'admin'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role. Must be user or admin.' });
            }
            const updated = await this.userService.updateUserRole(req.params.id, role, req.user.role as UserRole);
            if (!updated) {
                return res.status(403).json({ message: 'Cannot update this user\'s role.' });
            }
            await this.activityService.log({
                user_id: req.user.id,
                entity_type: EntityType.USER,
                entity_id: req.params.id,
                action: UserAction.ROLE_CHANGED,
                action_details: { new_role: role, target_user_id: req.params.id },
            });
            res.status(200).json(updated);
        });

        // Set a user's permissions (superadmin only)
        this.router.put('/admin/users/:id/permissions', requirePermission(UserPermission.MANAGE), async (req: Request, res: Response) => {
            const { permissions } = req.body;
            if (!Array.isArray(permissions)) {
                return res.status(400).json({ message: 'permissions must be an array.' });
            }
            const ok = await this.userService.setUserPermissions(req.params.id, permissions as Permission[], req.user.role as UserRole);
            if (!ok) return res.status(403).json({ message: 'Only superadmin can set permissions.' });
            await this.activityService.log({
                user_id: req.user.id,
                entity_type: EntityType.USER,
                entity_id: req.params.id,
                action: UserAction.PERMISSIONS_CHANGED,
                action_details: { permissions, target_user_id: req.params.id },
            });
            res.status(200).json({ success: true });
        });

        // Assign a permission role to a user (sets role + applies its permissions atomically)
        this.router.patch('/admin/users/:id/assign-role', requirePermission(UserPermission.MANAGE), async (req: Request, res: Response) => {
            const { role_id } = req.body;
            if (!role_id) return res.status(400).json({ message: 'role_id is required' });
            const updated = await this.userService.assignRole(req.params.id, role_id);
            if (!updated) return res.status(404).json({ message: 'User or role not found' });
            await this.activityService.log({
                user_id: req.user.id,
                entity_type: EntityType.USER,
                entity_id: req.params.id,
                action: UserAction.ROLE_CHANGED,
                action_details: { permission_role_id: role_id, target_user_id: req.params.id },
            });
            res.status(200).json(updated);
        });

        // Get all available permissions grouped by entity (for the UI checkboxes)
        this.router.get('/admin/permissions', requirePermission(UserPermission.MANAGE), (_req: Request, res: Response) => {
            res.status(200).json({
                leads: Object.values(LeadPermission),
                worker: Object.values(WorkerPermission),
                sources: Object.values(SourcePermission),
                buyers: Object.values(BuyerPermission),
                managers: Object.values(ManagerPermission),
                settings: Object.values(SettingsPermission),
                users: Object.values(UserPermission),
                activity: Object.values(ActivityPermission),
            });
        });
    }

    public routes(): Router {
        return this.router;
    }
}
