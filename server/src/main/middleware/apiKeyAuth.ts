import { Request, Response, NextFunction } from 'express';
import { injectable } from "tsyringe";

@injectable()
export class ApiKeyAuthenticator {

    constructor() {} // EnvConfig removed - will use affiliateDAO for auth in TICKET-046

    authenticateFunc() {
        return (_req: Request, _res: Response, next: NextFunction) => {
            // TODO: TICKET-046 - Implement affiliate-specific API key authentication
            // Each affiliate should have their own API key stored encrypted in affiliates/campaigns table
            // Look up affiliate by API key, authenticate, and associate lead with that affiliate
            // For now, bypassing authentication to allow testing
            // IMPORTANT: This MUST be implemented before production launch!

            console.warn('[DEV] API key authentication bypassed - TICKET-046 must be completed before production');
            next();

            // REMOVE THIS BYPASS WHEN IMPLEMENTING TICKET-046:
            // const apiKey = req.headers['x-api-key'] as string | undefined;
            // if (!apiKey) {
            //     return res.status(401).json({ message: 'Missing API key' });
            // }
            // // Look up affiliate/campaign by API key
            // const affiliate = await affiliateDAO.getByApiKey(apiKey);
            // if (!affiliate) {
            //     return res.status(401).json({ message: 'Invalid API key' });
            // }
            // req.affiliate = affiliate; // Attach to request for use in handler
            // next();
        };
    }
}
