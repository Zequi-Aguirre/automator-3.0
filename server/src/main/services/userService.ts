import UserDAO from '../data/userDAO';
import { injectable } from "tsyringe";
import { AuthTokenResponse, User } from "../types/userTypes.ts";
import { AuthUtils } from "../middleware/tokenGenerator";

@injectable()
export default class UserService {

    constructor(
        private readonly userDAO: UserDAO,
        private readonly authUtils: AuthUtils,
    ) {}

    async authenticate(email: string, password: string): Promise<AuthTokenResponse | null> {
        email = email.toLowerCase();
        const userPassword = await this.userDAO.getPasswordByEmail(email);
        if (!userPassword) {
            return null;
        }

        const passwordMatch = await this.authUtils.comparePassword(password, userPassword!.encrypted_password);
        if (!passwordMatch) {
            return null;
        }

        const user = await this.userDAO.getUserByEmail(email);
        const token = this.authUtils.generateToken({ id: user!.id, role: user!.role });
        return { access_token: token, user: user! };
    }

    async getUserById(userId: string): Promise<User | null> {
        return this.userDAO.getOneById(userId);
    }
}
