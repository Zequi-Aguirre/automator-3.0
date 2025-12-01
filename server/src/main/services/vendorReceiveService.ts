import { injectable } from "tsyringe";
import VendorReceiveDAO from "../data/vendorReceiveDAO";

@injectable()
export default class VendorReceiveService {
    constructor(private readonly dao: VendorReceiveDAO) {}

    async receive(payload: Record<string, any>) {
        return await this.dao.create(payload);
    }
}