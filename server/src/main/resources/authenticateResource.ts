import express, { Request, Response, Router } from 'express';
import UserService from '../services/userService';
import ActivityService from '../services/activityService';
import { AuthAction, EntityType, UserAction } from '../types/activityTypes';
import { injectable } from "tsyringe";
import { AccountRequestDTO } from '../types/userTypes';

@injectable()
export default class AuthenticateResource {

    private readonly router: Router;

    constructor(
        private readonly userService: UserService,
        private readonly activityService: ActivityService
    ) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {

        this.router.post('/', async (req: Request, res: Response) => {
            const { email, password } = req.body;
            const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;
            const user_agent = req.headers['user-agent'] ?? null;

            const response = await this.userService.authenticate(email, password);
            if (!response) {
                await this.activityService.log({
                    action: AuthAction.LOGIN_FAILED,
                    action_details: { email, ip, user_agent }
                });
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            await this.activityService.log({
                user_id: response.user.id,
                action: AuthAction.LOGIN,
                action_details: { ip, user_agent }
            });

            res.status(200).json(response);
        });

        // Public: user-initiated forgot-password — sends magic-link email (TICKET-151)
        this.router.post('/forgot-password', async (req: Request, res: Response) => {
            const { email } = req.body;
            if (!email || typeof email !== 'string') {
                return res.status(400).json({ message: 'email is required' });
            }
            // Always 200 — don't reveal whether the email exists
            try {
                await this.userService.requestPasswordReset(email);
                await this.activityService.log({
                    action: AuthAction.LOGIN_FAILED, // reuse closest action; details clarify intent
                    action_details: { type: 'password_reset_requested', email },
                });
            } catch (err) {
                console.error('Error in forgot-password:', err);
            }
            return res.status(200).json({ success: true });
        });

        // Public: set password using a magic-link token (TICKET-151)
        this.router.post('/set-password-token', async (req: Request, res: Response) => {
            const { token, new_password } = req.body;
            if (!token || typeof token !== 'string') {
                return res.status(400).json({ message: 'token is required' });
            }
            if (!new_password || typeof new_password !== 'string' || new_password.length < 6) {
                return res.status(400).json({ message: 'new_password must be at least 6 characters' });
            }
            try {
                await this.userService.setPasswordWithToken(token, new_password);
                await this.activityService.log({
                    action: AuthAction.LOGIN,
                    action_details: { type: 'password_set_by_token' },
                });
                return res.status(200).json({ success: true });
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to set password';
                return res.status(400).json({ message });
            }
        });

        // Public: request an account (creates pending user + notifies approvers)
        this.router.post('/request-account', async (req: Request, res: Response) => {
            try {
                const { email, name } = req.body as AccountRequestDTO;
                if (!email || !name) {
                    return res.status(400).json({ message: 'email and name are required' });
                }
                const { user, priorDenials } = await this.userService.requestAccount({ email, name });
                await this.activityService.log({
                    entity_type: EntityType.USER,
                    entity_id: user.id,
                    action: UserAction.USER_ACCOUNT_REQUESTED,
                    action_details: { name, email, prior_denials: priorDenials },
                });
                return res.status(201).json({ success: true });
            } catch (error) {
                console.error('Error requesting account:', error);
                const message = error instanceof Error ? error.message : 'Failed to request account';
                return res.status(400).json({ message });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}
