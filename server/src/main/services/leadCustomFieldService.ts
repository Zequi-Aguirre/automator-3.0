// TICKET-152: Lead Custom Fields Service
import { injectable } from 'tsyringe';
import LeadCustomFieldDAO from '../data/leadCustomFieldDAO';
import ActivityService from './activityService';
import { LeadCustomField, LeadCustomFieldCreateDTO, LeadCustomFieldUpdateDTO } from '../types/leadCustomFieldTypes';
import { EntityType, LeadCustomFieldAction } from '../types/activityTypes';

const KEY_REGEX = /^[a-z][a-z0-9_]*$/;

@injectable()
export default class LeadCustomFieldService {
    constructor(
        private readonly leadCustomFieldDAO: LeadCustomFieldDAO,
        private readonly activityService: ActivityService,
    ) {}

    async getAll(): Promise<LeadCustomField[]> {
        return this.leadCustomFieldDAO.getAll();
    }

    async getAllActive(): Promise<LeadCustomField[]> {
        return this.leadCustomFieldDAO.getAllActive();
    }

    async getByKeys(keys: string[]): Promise<LeadCustomField[]> {
        return this.leadCustomFieldDAO.getByKeys(keys);
    }

    async getAutoDiscoveredCount(): Promise<number> {
        return this.leadCustomFieldDAO.getAutoDiscoveredCount();
    }

    async create(data: LeadCustomFieldCreateDTO, userId?: string | null): Promise<LeadCustomField> {
        if (!data.key || !KEY_REGEX.test(data.key)) {
            throw new Error('Key must be snake_case (lowercase letters, digits, underscores; must start with a letter)');
        }
        if (!data.label || data.label.trim().length === 0) {
            throw new Error('Label is required');
        }
        if ((data.field_type === 'select' || data.field_type === 'multiselect') && (!data.options || data.options.length === 0)) {
            throw new Error('Options are required for select and multiselect fields');
        }

        const existing = await this.leadCustomFieldDAO.getByKey(data.key);
        if (existing) {
            throw new Error(`A field with key "${data.key}" already exists`);
        }

        const field = await this.leadCustomFieldDAO.create({ ...data, label: data.label.trim() });
        await this.activityService.log({
            user_id: userId,
            entity_type: EntityType.LEAD_CUSTOM_FIELD,
            entity_id: field.id,
            action: LeadCustomFieldAction.CREATED,
            action_details: { key: field.key, label: field.label },
        });
        return field;
    }

    async update(id: string, data: LeadCustomFieldUpdateDTO, userId?: string | null): Promise<LeadCustomField> {
        if (data.label !== undefined && data.label.trim().length === 0) {
            throw new Error('Label cannot be empty');
        }
        if (data.label !== undefined) data.label = data.label.trim();

        const field = await this.leadCustomFieldDAO.update(id, data);
        await this.activityService.log({
            user_id: userId,
            entity_type: EntityType.LEAD_CUSTOM_FIELD,
            entity_id: field.id,
            action: LeadCustomFieldAction.UPDATED,
            action_details: { key: field.key, changes: data },
        });
        return field;
    }

    async setActive(id: string, active: boolean, userId?: string | null): Promise<LeadCustomField> {
        const field = await this.leadCustomFieldDAO.update(id, { active });
        await this.activityService.log({
            user_id: userId,
            entity_type: EntityType.LEAD_CUSTOM_FIELD,
            entity_id: field.id,
            action: active ? LeadCustomFieldAction.ACTIVATED : LeadCustomFieldAction.DEACTIVATED,
            action_details: { key: field.key, label: field.label },
        });
        return field;
    }

    // Called by intake to auto-discover unknown keys
    async autoDiscoverKey(key: string): Promise<void> {
        if (!KEY_REGEX.test(key)) return; // skip malformed keys silently
        await this.leadCustomFieldDAO.upsertAutoDiscovered(key);
    }
}
