import { injectable } from "tsyringe";
import VendorDAO from "../data/vendorDAO";
import { Vendor } from "../types/vendorTypes";

@injectable()
export default class VendorService {
    constructor(private readonly vendorDAO: VendorDAO) {}

    async listVendors(): Promise<Vendor[]> {
        try {
            return await this.vendorDAO.getAll();
        } catch (error) {
            console.error("Error fetching vendors:", error);
            throw new Error("Failed to fetch vendors");
        }
    }

    async getVendorById(id: string): Promise<Vendor | null> {
        if (!id) throw new Error("Vendor ID is required");

        try {
            return await this.vendorDAO.getById(id);
        } catch (error) {
            console.error("Error fetching vendor by ID:", { id, error });
            throw new Error(`Failed to fetch vendor ${id}`);
        }
    }

    async getVendorByName(name: string): Promise<Vendor | null> {
        if (!name) throw new Error("Vendor name is required");

        try {
            return await this.vendorDAO.getByName(name);
        } catch (error) {
            console.error("Error fetching vendor by name:", { name, error });
            throw new Error(`Failed to fetch vendor '${name}'`);
        }
    }

    async createVendor(vendorData: Omit<Vendor, "id" | "created_at" | "updated_at">): Promise<Vendor> {
        if (!vendorData.name) throw new Error("Vendor name is required");

        try {
            return await this.vendorDAO.create(vendorData);
        } catch (error) {
            console.error("Error creating vendor:", { vendorData, error });
            throw new Error("Failed to create vendor");
        }
    }

    async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor> {
        if (!id) throw new Error("Vendor ID is required");

        try {
            return await this.vendorDAO.update(id, updates);
        } catch (error) {
            console.error("Error updating vendor:", { id, updates, error });
            throw new Error(`Failed to update vendor ${id}`);
        }
    }

    async deleteVendor(id: string): Promise<void> {
        if (!id) throw new Error("Vendor ID is required");

        try {
            await this.vendorDAO.delete(id);
        } catch (error) {
            console.error("Error deleting vendor:", { id, error });
            throw new Error(`Failed to delete vendor ${id}`);
        }
    }
}