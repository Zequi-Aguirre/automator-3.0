import { injectable } from "tsyringe";
import { MongoDBContainer } from "../config/mongoDBContainer";
import { MongoLead, Lead } from "../types/leadTypes";
import {Collection, Db, Filter, ObjectId, WithId} from "mongodb";
import { EnvConfig } from "../config/envConfig";

@injectable()
export default class MongoDAO {
    private db: Db | null = null;
    private readonly isTestEnvironment: boolean;

    constructor(
        private readonly container: MongoDBContainer,
        private readonly config: EnvConfig
    ) {
        this.isTestEnvironment = this.config.environment === 'local' || this.config.environment === 'staging';
    }

    private async getCollection(): Promise<Collection<MongoLead>> {
        if (!this.db) {
            this.db = await this.container.database();
        }
        return this.db.collection<MongoLead>("leads");
    }

    private normalizeId(id: string): ObjectId {
        try {
            return new ObjectId(id);
        } catch (error) {
            throw new Error(`Invalid MongoDB ID format: ${id}`);
        }
    }

    private convertToApplicationLead(mongoLead: MongoLead): Lead {
        const nameParts = mongoLead.name?.split(' ') || ['', ''];
        return {
            id: mongoLead._id?.toString() || '',
            address: mongoLead.address || '',
            city: mongoLead.city || '',
            state: mongoLead.state || '',
            county: mongoLead.county || '',
            county_id: '',
            zipcode: mongoLead.zipCode || '',
            first_name: nameParts[0],
            last_name: nameParts.slice(1).join(' '),
            phone: mongoLead.phoneNumber || '',
            email: mongoLead.emailAddress || '',
            is_test: false,
            created: mongoLead.createdAt?.toISOString() || new Date().toISOString(),
            buyer_lead: null,
            vendor_lead_id: mongoLead.zb_id || ''
        };
    }

    async getLeadById(id: string): Promise<Lead | null> {
        try {
            if (this.isTestEnvironment) {
                console.log(`${this.config.environment.toUpperCase()}: Fetching lead from MongoDB - ID: ${id}`);
            }

            const collection = await this.getCollection();

            // Properly type the query filter
            const filter: Filter<MongoLead> = {
                $or: [
                    // Cast the ObjectId to proper type for MongoDB Filter
                    { _id: this.normalizeId(id) as any }, // Type assertion needed for MongoDB driver compatibility
                    { id: id }
                ],
                trash: { $ne: true },
                sent: { $ne: true }
            };

            const mongoLead = await collection.findOne(filter);

            if (this.isTestEnvironment) {
                console.log('MongoDB lead ID:', mongoLead?._id);
                console.log('MongoDB lead name:', mongoLead?.name);
                console.log('MongoDB lead email:', mongoLead?.emailAddress);
            }

            return mongoLead ? this.convertToApplicationLead(mongoLead) : null;
        } catch (error) {
            console.error('Error fetching MongoDB lead:', error);
            throw new Error(`MongoDB fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getMany(filters: { page: number; limit: number }): Promise<{ leads: Lead[]; count: number }> {
        try {
            if (this.isTestEnvironment) {
                console.log(`${this.config.environment.toUpperCase()}: Fetching leads from MongoDB - Page: ${filters.page}, Limit: ${filters.limit}`);
            }

            const collection = await this.getCollection();
            const skip = (filters.page - 1) * filters.limit;

            // Define the filter explicitly
            const filterQuery: Filter<MongoLead> = {
                trash: { $ne: true },
                sent: { $ne: true }
            };

            // Fetch the leads sequentially
            const mongoLeads: WithId<MongoLead>[] = await collection.find(filterQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(filters.limit)
                .toArray();

            const totalCount: number = await collection.countDocuments(filterQuery);

            if (this.isTestEnvironment) {
                console.log(`Found ${mongoLeads.length} leads, total count: ${totalCount}`);
            }

            return {
                leads: mongoLeads.map(lead => this.convertToApplicationLead(lead)),
                count: totalCount
            };
        } catch (error) {
            console.error('Error fetching MongoDB leads:', error);
            throw new Error(`MongoDB fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async markLeadAsTrash(leadId: string): Promise<void> {
        try {
            if (this.isTestEnvironment) {
                if (this.config.environment === 'local') {
                    console.log('MOCK: Would mark lead as trash in MongoDB:', leadId);
                    return;
                }
                console.log('TEST: Simulating trash lead in MongoDB:', leadId);
                return;
            }

            const collection = await this.getCollection();
            const filter: Filter<MongoLead> = { id: this.normalizeId(leadId) };

            await collection.updateOne(
                filter,
                {
                    $set: {
                        trash: true,
                        trashDate: new Date(),
                        lastModified: new Date()
                    }
                }
            );

            console.log('PRODUCTION: Lead marked as trash in MongoDB:', leadId);
        } catch (error) {
            console.error('Error marking MongoDB lead as trash:', error);
            throw new Error(`MongoDB trash operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async markLeadAsSent(leadId: string, migrationInfo: string): Promise<void> {
        try {
            if (this.isTestEnvironment) {
                if (this.config.environment === 'local') {
                    console.log('MOCK: Would mark lead as sent in MongoDB:', leadId);
                    console.log('MOCK: Migration info:', migrationInfo);
                    return;
                }
                console.log('TEST: Simulating sent lead in MongoDB:', leadId);
                return;
            }

            const collection = await this.getCollection();
            const filter: Filter<MongoLead> = { id: this.normalizeId(leadId) };

            await collection.updateOne(
                filter,
                {
                    $set: {
                        sent: true,
                        sentDate: new Date(),
                        lastModified: new Date()
                    }
                }
            );

            console.log('PRODUCTION: Lead marked as sent in MongoDB:', leadId);
        } catch (error) {
            console.error('Error marking MongoDB lead as sent:', error);
            throw new Error(`MongoDB send operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async cleanup(): Promise<void> {
        if (this.container) {
            await this.container.disconnect();
            this.db = null;
        }
    }
}