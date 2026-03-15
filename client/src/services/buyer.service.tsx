import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { Buyer, BuyerCreateDTO, BuyerUpdateDTO } from "../types/buyerTypes";

class BuyerService {
    constructor(private readonly api: AxiosProvider) {}

    async getAll(filters: {
        page: number;
        limit: number;
        search?: string;
    }): Promise<{ items: Buyer[]; count: number }> {
        const res = await this.api.getApi().get(
            "/api/buyers",
            { params: filters }
        );
        return res.data;
    }

    async getById(id: string): Promise<Buyer> {
        const res = await this.api.getApi().get(`/api/buyers/${id}`);
        return res.data;
    }

    async create(dto: BuyerCreateDTO): Promise<Buyer> {
        const res = await this.api.getApi().post("/api/buyers", dto);
        return res.data;
    }

    async update(id: string, dto: BuyerUpdateDTO): Promise<Buyer> {
        const res = await this.api.getApi().put(`/api/buyers/${id}`, dto);
        return res.data;
    }

    async delete(id: string): Promise<Buyer> {
        const res = await this.api.getApi().delete(`/api/buyers/${id}`);
        return res.data;
    }

    async reorderPriority(
        buyerId: string,
        oldPriority: number,
        newPriority: number
    ): Promise<void> {
        await this.api.getApi().put("/api/buyers/reorder-priority", {
            buyerId,
            oldPriority,
            newPriority
        });
    }
}

const buyerService = new BuyerService(authProvider);
export default buyerService;
