import { injectable } from 'tsyringe';
import { IDatabase } from 'pg-promise';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { DBContainer } from '../config/DBContainer';
import { PlatformBuyerMapping } from '../types/reconciliationTypes';

@injectable()
export default class PlatformBuyerMappingDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async upsert(data: {
        platform: string;
        platform_buyer_id: string;
        platform_buyer_name: string | null;
        automator_buyer_id: string | null;
        mapped_by: string;
    }): Promise<void> {
        await this.db.none(
            `INSERT INTO platform_buyer_mappings (platform, platform_buyer_id, platform_buyer_name, automator_buyer_id, mapped_by)
             VALUES ($[platform], $[platform_buyer_id], $[platform_buyer_name], $[automator_buyer_id], $[mapped_by])
             ON CONFLICT (platform, platform_buyer_id) DO UPDATE SET
                 platform_buyer_name  = EXCLUDED.platform_buyer_name,
                 automator_buyer_id   = EXCLUDED.automator_buyer_id,
                 mapped_by            = EXCLUDED.mapped_by,
                 mapped_at            = NOW()`,
            data
        );
    }

    async getByPlatform(platform: string): Promise<PlatformBuyerMapping[]> {
        return await this.db.manyOrNone<PlatformBuyerMapping>(
            `SELECT * FROM platform_buyer_mappings WHERE platform = $[platform]`,
            { platform }
        );
    }

    async getAll(): Promise<PlatformBuyerMapping[]> {
        return await this.db.manyOrNone<PlatformBuyerMapping>(
            `SELECT * FROM platform_buyer_mappings WHERE automator_buyer_id IS NOT NULL`
        );
    }
}
