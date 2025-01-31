import { MongoClient, Db, ServerApiVersion, MongoClientOptions } from "mongodb";

export class MongoDBContainer {
    private readonly client: MongoClient;
    private db: Db | null = null;

    constructor(mongoURI: string) {
        const options: MongoClientOptions = {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: false,
                deprecationErrors: true
            },
            ssl: true,
            tls: true,
            tlsCAFile: undefined,  // Let Node.js use system CA certificates
            minPoolSize: 0,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 30000,
            retryWrites: true,
            w: "majority",
            authSource: "admin",
            family: 4,  // Force IPv4
            tlsAllowInvalidHostnames: false,
            replicaSet: "atlas-l3sah4-shard-0",  // Use your actual replica set name from error log
            authMechanism: "SCRAM-SHA-1"
        };

        this.client = new MongoClient(mongoURI, options);
    }

    async database(): Promise<Db> {
        if (!this.db) {
            try {
                await this.client.connect();
                this.db = this.client.db();
                console.log('Successfully connected to MongoDB');
            } catch (error) {
                console.error('Failed to connect to MongoDB:', error);
                throw new Error('Database connection failed');
            }
        }
        return this.db;
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            try {
                await this.client.close();
                this.db = null;
                console.log('Successfully disconnected from MongoDB');
            } catch (error) {
                console.error('Failed to disconnect from MongoDB:', error);
                throw new Error('Database disconnection failed');
            }
        }
    }
}