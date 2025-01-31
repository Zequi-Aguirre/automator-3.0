import express, { Request, Response, Router } from 'express';
import UserService from '../services/userService';
import { injectable } from "tsyringe";

@injectable()
export default class AuthenticateResource {

    private readonly router: Router;

    constructor(private readonly userService: UserService) {

        this.router = express.Router();
        this.userService = userService;
        this.initializeRoutes();
    }

    private initializeRoutes() {

        this.router.post('/', async (req: Request, res: Response) => {
            const { email, password } = req.body;
            const response = await this.userService.authenticate(email, password)
            if (!response) {
                res.status(401).json({ message: 'Unauthorized' });
                return
            }
            res.status(200).json(response)
        });
    }

    public routes(): Router {
        return this.router;
    }
}
