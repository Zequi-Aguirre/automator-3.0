export type LandingPage = {
    id: string;
    url: string;
    name: string;
    campaign_id: string;
    template_id: string;
    allow_login: boolean;
    created: Date;
    updated: Date;
    deleted: Date | null;
}