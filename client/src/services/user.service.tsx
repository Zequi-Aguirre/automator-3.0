import { User } from "../types/userTypes";
import { authProvider, AxiosProvider } from "../config/axiosProvider.ts";

class UserService {
    constructor(private readonly api : AxiosProvider) {}

    authenticateUser = async (email: string, password: string): Promise<{ access_token : string, user: User, role: string }> => {
        // getApi(false) means we don't need to send the token in the header
        return await this.api.getApi(false).post('/api/authenticate', { email, password }).then(async (response) => {
            const token = response.data.access_token;
            this.api.setToken(token);
            return {
                role: response.data.user.role,
                ...response.data
            };
        })
    }

    getUserInfo = async (): Promise<User> => {
        return await this.api.getApi().get('/api/users/info').then((response) => response.data);
    }

    signOut = (): { message: string } => {
        this.api.removeToken(); // Remove the token from localStorage
        return { message: 'success' };
    }
}

const userService = new UserService(authProvider);

export default userService;
