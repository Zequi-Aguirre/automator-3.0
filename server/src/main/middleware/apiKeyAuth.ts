import { Request, Response, NextFunction } from 'express';
import { injectable } from "tsyringe";
import { EnvConfig } from '../config/envConfig';

@injectable()
export class ApiKeyAuthenticator {

    constructor(private readonly config: EnvConfig) {}

    authenticateFunc() {
        return (req: Request, res: Response, next: NextFunction) => {
            const apiKey = req.headers['x-api-key'] as string | undefined;

            if (!apiKey || apiKey !== this.config.leadIntakeApiKey) {
                return res.status(401).json({ message: 'Invalid or missing API key' });
            }

            next();
        };
    }
}
