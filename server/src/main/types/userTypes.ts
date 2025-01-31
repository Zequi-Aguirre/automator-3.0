export type User = {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin' | 'superadmin';
};

export type AuthTokenResponse = {
    access_token: string;
    user: Partial<User>;
};