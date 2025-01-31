import dotenv from 'dotenv';

dotenv.config();

export class EnvConfig {
    public readonly campaignKey: string;
    public readonly allowedOrigins: string;
    public readonly dbConfig: DBConfig;
    public readonly environment: string;
    public readonly jwtSecret: string;
    public readonly mongoUri: string;
    public readonly buyerUrl: string;
    public readonly serverUrl: string;
    public readonly useWorker: string;
    public readonly useWorkerCron: string;
    public readonly workerConfig: WorkerConfig;

    constructor() {
        this.campaignKey = process.env.CAMPAIGN_KEY!;
        this.allowedOrigins = process.env.VITE_ALLOWED_ORIGINS!;
        this.dbConfig = new DBConfig();
        this.environment = process.env.ENVIRONMENT!;
        this.jwtSecret = process.env.JWT_SECRET!;
        this.buyerUrl = process.env.BUYER_URL!;
        this.mongoUri = process.env.MONGODB_URI!;
        this.serverUrl = process.env.VITE_SERVER_URL!;
        this.useWorker = process.env.USE_WORKER!;
        this.useWorkerCron = process.env.USE_WORKER_CRON!;
        this.workerConfig = new WorkerConfig();
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

export class WorkerConfig {
    constructor(
        public readonly workerGetLeadsUrl = process.env.WORKER_GET_LEADS_URL!,
        public readonly workerProcessEmailsUrl = process.env.WORKER_PROCESS_EMAILS_URL!
    ) {}
}