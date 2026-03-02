import { Request, Response, NextFunction } from 'express';
import { injectable } from "tsyringe";
import SourceDAO from "../data/sourceDAO";
import { Source } from "../types/sourceTypes";

/**
 * Extend Express Request type to include source
 * TICKET-046: Source attached by authentication middleware
 */
declare global {
    namespace Express {
        interface Request {
            source?: Source;
        }
    }
}

/**
 * ApiKeyAuthenticator - Middleware for source-based API authentication
 * TICKET-046: Implements Bearer token authentication for lead intake API
 *
 * Authentication Flow:
 * 1. Extract Bearer token from Authorization header
 * 2. Look up source by token in database (excludes soft-deleted sources)
 * 3. Attach source to req.source if valid
 * 4. Return 401 if token missing or invalid
 *
 * Header Format: Authorization: Bearer <64-char-token>
 */
@injectable()
export class ApiKeyAuthenticator {

    constructor(
        private readonly sourceDAO: SourceDAO
    ) {}

    /**
     * Express middleware function for Bearer token authentication
     */
    authenticateFunc() {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                // Extract Bearer token from Authorization header
                const token = this.extractBearerToken(req);

                if (!token) {
                    console.warn('Source authentication failed: no token provided', {
                        path: req.path,
                        ip: req.ip
                    });

                    return res.status(401).json({
                        error: 'Authorization required',
                        message: 'Please provide Authorization header with Bearer token'
                    });
                }

                // Validate token against database
                const source = await this.sourceDAO.getByToken(token);

                if (!source) {
                    console.warn('Source authentication failed: invalid token', {
                        path: req.path,
                        ip: req.ip,
                        tokenPrefix: token.substring(0, 8) + '...'  // Log prefix for debugging
                    });

                    return res.status(401).json({
                        error: 'Invalid token',
                        message: 'The provided Bearer token is not valid or has been revoked'
                    });
                }

                // Attach authenticated source to request
                req.source = source;

                console.info('Source authenticated', {
                    sourceId: source.id,
                    sourceName: source.name,
                    path: req.path
                });

                next();

            } catch (error) {
                console.error('Error during source authentication', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    path: req.path
                });

                return res.status(500).json({
                    error: 'Authentication error',
                    message: 'An error occurred during authentication'
                });
            }
        };
    }

    /**
     * Extract Bearer token from Authorization header
     * Expected format: "Bearer <token>"
     *
     * @returns Token string or null if not found/invalid format
     */
    private extractBearerToken(req: Request): string | null {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return null;
        }

        // Handle array (shouldn't happen but defensive)
        const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;

        // Split "Bearer <token>"
        const parts = authValue.split(' ');

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }

        return parts[1];  // Return the token part
    }
}
