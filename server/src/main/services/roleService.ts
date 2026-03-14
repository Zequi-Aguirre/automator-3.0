import { injectable } from "tsyringe";
import RoleDAO from "../data/roleDAO";
import ActivityService from "./activityService";
import { PermissionRole } from "../types/roleTypes";
import { Permission } from "../types/permissionTypes";
import { RoleAction } from "../types/activityTypes";

@injectable()
export default class RoleService {
    constructor(
        private readonly roleDAO: RoleDAO,
        private readonly activityService: ActivityService,
    ) {}

    async getAll(): Promise<PermissionRole[]> {
        return this.roleDAO.getAll();
    }

    async getById(id: string): Promise<PermissionRole | null> {
        return this.roleDAO.getById(id);
    }

    async create(name: string, permissions: Permission[], userId: string): Promise<PermissionRole> {
        if (!name?.trim()) throw new Error('Role name is required');
        const role = await this.roleDAO.create(name.trim(), permissions);
        await this.activityService.log({
            user_id: userId,
            action: RoleAction.CREATED,
            action_details: { name: role.name, permission_count: permissions.length },
        });
        return role;
    }

    async update(id: string, name: string, permissions: Permission[], userId: string): Promise<PermissionRole | null> {
        if (!name?.trim()) throw new Error('Role name is required');
        const updated = await this.roleDAO.update(id, name.trim(), permissions);
        if (!updated) return null;
        await this.activityService.log({
            user_id: userId,
            action: RoleAction.UPDATED,
            action_details: { name: updated.name, permission_count: permissions.length },
        });
        return updated;
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const existing = await this.roleDAO.getById(id);
        if (!existing) return false;
        const deleted = await this.roleDAO.delete(id);
        if (deleted) {
            await this.activityService.log({
                user_id: userId,
                action: RoleAction.DELETED,
                action_details: { name: existing.name },
            });
        }
        return deleted;
    }
}
