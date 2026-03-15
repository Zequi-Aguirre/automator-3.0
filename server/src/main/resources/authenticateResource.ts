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

        // Public: request an account (creates pending user + notifies approvers)
        this.router.post('/request-account', async (req: Request, res: Response) => {
            try {
                const { email, name } = req.body as AccountRequestDTO;
                if (!email || !name) {
                    return res.status(400).json({ message: 'email and name are required' });
                }
                const user = await this.userService.requestAccount({ email, name });
                await this.activityService.log({
                    entity_type: EntityType.USER,
                    entity_id: user.id,
                    action: UserAction.USER_ACCOUNT_REQUESTED,
                    action_details: { name, email },
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
