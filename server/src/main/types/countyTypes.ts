export type CountyBuyerFilterMode = 'include' | 'exclude';

export type County = {
    id: string;
    name: string;
    state: string;
    population: number;
    timezone: string;
    blacklisted: boolean;
    whitelisted: boolean;
    zip_codes: string[] | null;
    buyer_filter_mode: CountyBuyerFilterMode | null;
    buyer_filter_buyer_ids: string[];
}

export type CountyFilterUpdateDTO = {
    mode: CountyBuyerFilterMode | null;
    buyer_ids: string[];
};