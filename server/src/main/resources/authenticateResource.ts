import express, { Request, Response, Router } from 'express';
import UserService from '../services/userService';
import ActivityService from '../services/activityService';
import { ActivityAction } from '../types/activityTypes';
import { injectable } from "tsyringe";

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
                    action: ActivityAction.USER_LOGIN_FAILED,
                    action_details: { email, ip, user_agent }
                });
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            await this.activityService.log({
                user_id: response.user.id,
                action: ActivityAction.USER_LOGIN,
                action_details: { ip, user_agent }
            });

            res.status(200).json(response);
        });
    }

    public routes(): Router {
        return this.router;
    }
}
