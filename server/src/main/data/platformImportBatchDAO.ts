import { injectable } from 'tsyringe';
import { IDatabase } from 'pg-promise';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { DBContainer } from '../config/DBContainer';
import { PlatformImportBatch } from '../types/reconciliationTypes';

@injectable()
export default class PlatformImportBatchDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async insert(data: {
        platform: string;
        filename: string | null;
        row_count: number;
        imported_by: string;
    }): Promise<PlatformImportBatch> {
        return await this.db.one<PlatformImportBatch>(
            `INSERT INTO platform_import_batches (platform, filename, row_count, imported_by)
             VALUES ($[platform], $[filename], $[row_count], $[imported_by])
             RETURNING *`,
            data
        );
    }

    async getLastPerPlatform(): Promise<PlatformImportBatch[]> {
        return await this.db.manyOrNone<PlatformImportBatch>(
            `SELECT DISTINCT ON (platform) *
             FROM platform_import_batches
             ORDER BY platform, imported_at DESC`
        );
    }
}
