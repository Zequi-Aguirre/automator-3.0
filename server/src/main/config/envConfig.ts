import dotenv from 'dotenv';

dotenv.config();

export class EnvConfig {
    public readonly dbConfig: DBConfig;
    public readonly environment: string;
    public readonly jwtSecret: string;
    public readonly serverUrl: string;
    public readonly leadVendorURL: string;

    constructor() {
        this.dbConfig = new DBConfig();
        this.environment = process.env.ENVIRONMENT!;
        this.jwtSecret = process.env.JWT_SECRET!;
        this.serverUrl = process.env.VITE_SERVER_URL!;
        this.leadVendorURL = process.env.LEAD_VENDOR_URL!;
    }
}

export class DBConfig {
    constructor(
        public readonly dbDb = process.env.DB_DB!,
        public readonly dbHost = process.env.DB_HOST!,
        public readonly dbPass = process.env.DB_PASS!,
        public readonly dbPort = process.env.DB_PORT!,
        public readonly dbUser = process.env.DB_USER!
    ) {}
}