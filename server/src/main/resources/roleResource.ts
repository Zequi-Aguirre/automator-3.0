import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import RoleService from "../services/roleService";
import { requirePermission } from '../middleware/requirePermission';
import { UserPermission } from '../types/permissionTypes';
import { Permission } from '../types/permissionTypes';

@injectable()
export default class RoleResource {
    private readonly router: Router;

    constructor(private readonly roleService: RoleService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // GET /api/roles — list all roles
        this.router.get('/', requirePermission(UserPermission.MANAGE), async (_req: Request, res: Response) => {
            try {
                const roles = await this.roleService.getAll();
                res.status(200).json(roles);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // POST /api/roles — create a role
        this.router.post('/', requirePermission(UserPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { name, permissions } = req.body;
                if (!name) return res.status(400).json({ error: 'name is required' });
                if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions must be an array' });
                const role = await this.roleService.create(name, permissions as Permission[], req.user.id);
                res.status(201).json(role);
            } catch (error) {
                const status = error instanceof Error && error.message.includes('required') ? 400 : 500;
                res.status(status).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // PUT /api/roles/:id — update a role
        this.router.put('/:id', requirePermission(UserPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { name, permissions } = req.body;
                if (!name) return res.status(400).json({ error: 'name is required' });
                if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions must be an array' });
                const updated = await this.roleService.update(req.params.id, name, permissions as Permission[], req.user.id);
                if (!updated) return res.status(404).json({ error: 'Role not found' });
                res.status(200).json(updated);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // DELETE /api/roles/:id — delete a role
        this.router.delete('/:id', requirePermission(UserPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const deleted = await this.roleService.delete(req.params.id, req.user.id);
                if (!deleted) return res.status(404).json({ error: 'Role not found' });
                res.status(204).send();
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}
