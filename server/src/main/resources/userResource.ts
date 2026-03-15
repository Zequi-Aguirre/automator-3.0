import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import UserService from "../services/userService.ts";
import ActivityService from "../services/activityService";
import { requirePermission } from '../middleware/requirePermission';
import { Permission, UserRole, LeadPermission, WorkerSettingsPermission, SourcePermission, BuyerPermission, ManagerPermission, CountyPermission, LogPermission, UserPermission, ActivityPermission, TrashReasonPermission, DisputePermission } from '../types/permissionTypes';
import { EntityType, UserAction } from '../types/activityTypes';
import { UserCreateDTO, UserUpdateDTO } from '../types/userTypes';

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
        this.router.get('/users', requirePermission(UserPermission.MANAGE), async (_req: Request, res: Response) => {
            const users = await this.userService.getAllUsers();
            res.status(200).json(users);
        });

        // Get a single user by ID
        this.router.get('/users/:id', requirePermission(UserPermission.MANAGE), async (req: Request, res: Response) => {
            const user = await this.userService.getUserById(req.params.id);
            if (!user) return res.status(404).json({ message: 'User not found' });
            res.status(200).json(user);
        });

        // Create a new user (superadmin only via users.manage)
        this.router.post('/users', requirePermission(UserPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { email, name, role } = req.body as UserCreateDTO;
                if (!email || !name || !role) {
                    return res.status(400).json({ message: 'email, name, and role are required' });
                }
                if (!['user', 'admin', 'superadmin'].includes(role)) {
                    return res.status(400).json({ message: 'Invalid role' });
                }
                const { user } = await this.userService.createUser({ email, name, role });
                await this.activityService.log({
                    user_id: req.user.id,
                    entity_type: EntityType.USER,
                    entity_id: user.id,
                    action: UserAction.USER_CREATED,
                    action_details: { name, email, role, created_by: req.user.id },
                });
                return res.status(201).json(user);
            } catch (error) {
                console.error('Error creating user:', error);
                return res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create user' });
            }
        });

        // Update a user's name/email
        this.router.patch('/users/:id', requirePermission(UserPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { name, email } = req.body as UserUpdateDTO;
                const updated = await this.userService.updateUser(req.params.id, { name, email });
                if (!updated) return res.status(404).json({ message: 'User not found' });
                return res.status(200).json(updated);
            } catch (error) {
                console.error('Error updating user:', error);
                return res.status(500).json({ message: 'Failed to update user' });
            }
        });

        // Update a user's role
        this.router.patch('/users/:id/role', requirePermission(UserPermission.MANAGE), async (req: Request, res: Response) => {
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
        this.router.put('/users/:id/permissions', requirePermission(UserPermission.MANAGE), async (req: Request, res: Response) => {
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
        this.router.patch('/users/:id/assign-role', requirePermission(UserPermission.MANAGE), async (req: Request, res: Response) => {
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

        // Admin-initiated password reset — generates temp password + sends invite email
        this.router.post('/users/:id/reset-password', requirePermission(UserPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                await this.userService.resetPassword(req.params.id);
                await this.activityService.log({
                    user_id: req.user.id,
                    entity_type: EntityType.USER,
                    entity_id: req.params.id,
                    action: UserAction.PASSWORD_RESET,
                    action_details: { initiated_by: req.user.id },
                });
                return res.status(200).json({ success: true });
            } catch (error) {
                console.error('Error resetting password:', error);
                return res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to reset password' });
            }
        });

        // User changes their own password (clears must_change_password)
        this.router.post('/change-password', async (req: Request, res: Response) => {
            try {
                const { new_password } = req.body;
                if (!new_password || typeof new_password !== 'string' || new_password.length < 6) {
                    return res.status(400).json({ message: 'new_password must be at least 6 characters' });
                }
                await this.userService.changePassword(req.user.id, new_password);
                await this.activityService.log({
                    user_id: req.user.id,
                    entity_type: EntityType.USER,
                    entity_id: req.user.id,
                    action: UserAction.PASSWORD_CHANGED,
                    action_details: {},
                });
                return res.status(200).json({ success: true });
            } catch (error) {
                console.error('Error changing password:', error);
                return res.status(500).json({ message: 'Failed to change password' });
            }
        });

        // Get all available permissions grouped by entity (for the UI checkboxes)
        this.router.get('/permissions', requirePermission(UserPermission.MANAGE), (_req: Request, res: Response) => {
            res.status(200).json({
                leads: Object.values(LeadPermission),
                sources: Object.values(SourcePermission),
                buyers: Object.values(BuyerPermission),
                managers: Object.values(ManagerPermission),
                counties: Object.values(CountyPermission),
                logs: Object.values(LogPermission),
                worker_settings: Object.values(WorkerSettingsPermission),
                users: Object.values(UserPermission),
                activity: Object.values(ActivityPermission),
                trash_reasons: Object.values(TrashReasonPermission),
                disputes: Object.values(DisputePermission),
            });
        });
    }

    public routes(): Router {
        return this.router;
    }
}
