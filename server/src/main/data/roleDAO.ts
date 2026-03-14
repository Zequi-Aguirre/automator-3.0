import { injectable } from "tsyringe";
import { IDatabase } from 'pg-promise';
import { DBContainer } from "../config/DBContainer";
import { PermissionRole } from "../types/roleTypes";
import { Permission } from "../types/permissionTypes";
import { IClient } from "pg-promise/typescript/pg-subset";

@injectable()
export default class RoleDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getAll(): Promise<PermissionRole[]> {
        const rows = await this.db.manyOrNone<{ id: string; name: string; permissions: Permission[]; created: string; updated: string }>(
            `SELECT id, name, permissions, created, updated FROM permission_roles ORDER BY name ASC`
        );
        return rows;
    }

    async getById(id: string): Promise<PermissionRole | null> {
        return this.db.oneOrNone<PermissionRole>(
            `SELECT id, name, permissions, created, updated FROM permission_roles WHERE id = $[id]`,
            { id }
        );
    }

    async create(name: string, permissions: Permission[]): Promise<PermissionRole> {
        return this.db.one<PermissionRole>(
            `INSERT INTO permission_roles (name, permissions) VALUES ($[name], $[permissions]) RETURNING id, name, permissions, created, updated`,
            { name, permissions: JSON.stringify(permissions) }
        );
    }

    async update(id: string, name: string, permissions: Permission[]): Promise<PermissionRole | null> {
        return this.db.oneOrNone<PermissionRole>(
            `UPDATE permission_roles SET name = $[name], permissions = $[permissions], updated = NOW() WHERE id = $[id] RETURNING id, name, permissions, created, updated`,
            { id, name, permissions: JSON.stringify(permissions) }
        );
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.db.result(
            `DELETE FROM permission_roles WHERE id = $[id]`,
            { id }
        );
        return result.rowCount > 0;
    }
}
