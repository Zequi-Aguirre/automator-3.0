// TICKET-130 — Zoe Bearer token auth middleware (DB-backed, not env var)
import { Request, Response, NextFunction } from 'express';
import { injectable } from 'tsyringe';
import ZoeKeyService from '../services/zoeKeyService';

@injectable()
export class ZoeAuthenticator {
    constructor(private readonly zoeKeyService: ZoeKeyService) {}

    authenticateFunc() {
        return async (req: Request, res: Response, next: NextFunction) => {
            const authHeader = req.headers['authorization'];
            if (!authHeader) return res.status(401).json({ error: 'Authorization header required' });

            const parts = Array.isArray(authHeader) ? authHeader[0].split(' ') : authHeader.split(' ');
            if (parts.length !== 2 || parts[0] !== 'Bearer') {
                return res.status(401).json({ error: 'Invalid Authorization header format. Expected: Bearer <token>' });
            }

            const token = parts[1];
            const key = await this.zoeKeyService.authenticate(token);

            if (!key) {
                return res.status(401).json({ error: 'Invalid or revoked API key' });
            }

            next();
        };
    }
}
