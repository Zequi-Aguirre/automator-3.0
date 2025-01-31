import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import UserService from "../services/userService.ts";

@injectable()
export default class UserResource {

    private readonly router: Router;

    constructor(private readonly userService: UserService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/info', async (req: Request, res: Response) => {
            const response = await this.userService.getUserById(req.user.id)
            res.status(200).json(response)
        });
    }

    public routes(): Router {
        return this.router;
    }
}