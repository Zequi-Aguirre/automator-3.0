// jwtUtils.ts
import { injectable } from 'tsyringe';
import jwt from 'jsonwebtoken';
import { EnvConfig } from "../config/envConfig.ts";
import { User } from "../types/userTypes.ts";
import bcrypt from 'bcryptjs';

interface DecodedToken extends Partial<User> {
    iat?: number;
    exp?: number;
}

@injectable()
export class AuthUtils {

    constructor(private readonly config: EnvConfig) {}

    generateToken(payload: object): string {
        return jwt.sign(payload, this.config.jwtSecret, { expiresIn: '24h' });
    }

    verifyToken(userId: string, token: string): string | object {
        const newUserData = jwt.verify(token, this.config.jwtSecret) as DecodedToken;
        if (newUserData.id !== userId) {
            return 'Invalid token';
        } else if (newUserData.exp && newUserData.exp < Date.now() / 1000) {
            return 'Token expired';
        } else {
            delete newUserData.iat;
            delete newUserData.exp;
            return newUserData;
        }
    }

    async hashPassword(password : string) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    async comparePassword(password : string, hash : string) {
        return await bcrypt.compare(password, hash);
    }
}