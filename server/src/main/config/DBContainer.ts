import pgPromise, { IDatabase } from 'pg-promise';
import { DBConfig } from "./envConfig.ts";
import { IClient, IConnectionParameters } from "pg-promise/typescript/pg-subset";

export class DBContainer {

    private readonly db: IDatabase<IClient>;

    constructor(config: DBConfig) {
        const connectionConfig: IConnectionParameters = {
            host: config.dbHost,
            port: parseInt(config.dbPort),
            database: config.dbDb,
            user: config.dbUser,
            password: config.dbPass,
            statement_timeout: 5000,
            query_timeout: 5000,
            lock_timeout: 5000,
            connectionTimeoutMillis: 5000
        };
        const pgp = pgPromise();
        this.db = pgp(connectionConfig);
    }

    database(): IDatabase<IClient> {
        return this.db;
    }
}
