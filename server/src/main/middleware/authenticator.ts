// Middleware to validate and authenticate the token
import { Request, Response, NextFunction } from 'express';
import { injectable } from "tsyringe";
import { User as DBUser } from "../types/userTypes";
import jwt from 'jsonwebtoken';
import { EnvConfig } from '../config/envConfig';
import UserDAO from '../data/userDAO';

declare module "express-serve-static-core" {
    interface Request {
        user: DBUser
    }
}

interface DecodedToken {
    id: string;
    exp: number;
    role: string;
  }

@injectable()
export class Authenticator {

    constructor(private readonly config: EnvConfig, private readonly userDAO: UserDAO) {}

    async authenticateToken(req: Request, res: Response, next: NextFunction) {
        try {
            const token = req.headers['authorization']?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ mensaje: 'Access token not provided' });
            }
    
            const newUserData = jwt.verify(token, this.config.jwtSecret) as DecodedToken;

            const expirationTimeWithin4Hours = newUserData.exp && newUserData.exp - (Date.now() / 1000) < 4 * 60 * 60;

            if (expirationTimeWithin4Hours) {
                const newToken = jwt.sign({ id: newUserData.id, role: newUserData.role }, this.config.jwtSecret, { expiresIn: '24h' });
                res.setHeader('New-Token', newToken);
            }
            const user = await this.userDAO.getOneById(newUserData.id);
    
            if (!user) {
                console.error(`No matching user with ${newUserData.id}`);
                return res.status(401)
            }

            // TODO nice to have check if the used is in watchlist and record activity or something
            if (req.path.includes("admin") && (user!.role !== 'admin' && user!.role !== 'superadmin')) {
                console.warn("Non-admin attempted to hit admin API");
                return res.sendStatus(403)
            } 
            req.user = user!;
            next();
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                return res.status(405).json({ mensaje: 'Token has expired' });
            }
        }
    }

    authenticateFunc() {
        return async (req: Request, res: Response, next: NextFunction) => {
            return await this.authenticateToken(req, res, next);
        };
    }

}
