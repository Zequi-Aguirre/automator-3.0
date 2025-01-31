export type User = {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin' | 'superadmin';
};

export type Session = {
    access_token: string;
    user: {
        email: string;
        id: string;
        name: string;
    }
}
