import dotenv from 'dotenv';

dotenv.config();

export class EnvConfig {
    public readonly dbConfig: DBConfig;
    public readonly environment: string;
    public readonly jwtSecret: string;
    public readonly serverUrl: string;
    public readonly makeEmailWebhookUrl: string;
    public readonly anthropicApiKey: string;
    public readonly openaiApiKey: string;
    public readonly platformSyncEncryptionKey: string;
    // TICKET-143: Facebook Lead Ads
    public readonly fbAppSecret: string;
    public readonly fbVerifyToken: string;
    public readonly clientUrl: string;
    constructor() {
        this.dbConfig = new DBConfig();
        this.environment = process.env.ENVIRONMENT!;
        this.jwtSecret = process.env.JWT_SECRET!;
        this.serverUrl = process.env.VITE_SERVER_URL!;
        this.makeEmailWebhookUrl = process.env.MAKE_EMAIL_WEBHOOK_URL ?? '';
        this.anthropicApiKey = process.env.ANTHROPIC_API_KEY ?? '';
        this.openaiApiKey = process.env.OPENAI_API_KEY ?? '';
        this.platformSyncEncryptionKey = process.env.PLATFORM_SYNC_ENCRYPTION_KEY ?? '';
        this.fbAppSecret = process.env.FB_APP_SECRET ?? '';
        this.fbVerifyToken = process.env.FB_VERIFY_TOKEN ?? '';
        this.clientUrl = process.env.VITE_CLIENT_URL ?? 'https://app.automator.io';
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