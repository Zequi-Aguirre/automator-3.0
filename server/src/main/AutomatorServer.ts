import "reflect-metadata";
import dotenv from 'dotenv';
import express, { Express } from "express";
import { appConfig } from "./config";
import { DependencyContainer } from "tsyringe";
import { EnvConfig } from "./config/envConfig";
import LeadResource from "./resources/leadResource";
import InjectionToken from "tsyringe/dist/typings/providers/injection-token";
import AuthenticateResource from "./resources/authenticateResource";
import { Authenticator } from "./middleware/authenticator";
import UserResource from "./resources/userResource";
import CampaignResource from "./resources/campaignResource";
import SettingsResource from "./resources/settingsResource.ts";
import { Worker } from './worker/Worker';
import JobResource from "./resources/jobResource.ts";
import AffiliateResource from "./resources/affiliateResource";
import CountyResource from "./resources/countyResource";
import LeadFormInputResource from "./resources/leadFormInputResource.ts";
import VendorReceiveResource from "./resources/vendorReceiveResource.ts";
import WorkerResource from "./resources/workerResource.ts";
import LeadIntakeResource from "./resources/leadIntakeResource.ts";
import LeadOpenResource from "./resources/leadOpenResource.ts";
import { ApiKeyAuthenticator } from "./middleware/apiKeyAuth.ts";
import WorkerSettingsDAO from "./data/workerSettingsDAO.ts";
import InvestorResource from "./resources/investorResource.ts";
import SendLogResource from "./resources/sendLogResource.ts";

dotenv.config();

export class AutomatorServer {
    private readonly app: Express;
    private worker: Worker | null = null;

    constructor(
        private readonly container: DependencyContainer,
        private readonly config: EnvConfig
    ) {
        this.container = container;
        this.config = config;
        this.app = express();
    }

    async setup(): Promise<AutomatorServer> {
        appConfig(this.app);
        const cont = this.container;
        this.registerIfNot(cont, EnvConfig, this.config);

        // Register the Worker with the container
        cont.registerSingleton(Worker);

        const authenticator = cont.resolve(Authenticator);
        const authFunc = authenticator.authenticateFunc();
        const apiKeyFunc = cont.resolve(ApiKeyAuthenticator).authenticateFunc();

        // Set up routes
        this.app.use("/api/affiliates", authFunc, cont.resolve(AffiliateResource).routes());
        this.app.use("/api/authenticate", cont.resolve(AuthenticateResource).routes());
        this.app.use("/api/counties", authFunc, cont.resolve(CountyResource).routes());
        this.app.use("/api/campaigns", authFunc, cont.resolve(CampaignResource).routes());
        this.app.use("/api/investors", authFunc, cont.resolve(InvestorResource).routes());
        this.app.use("/api/jobs", authFunc, cont.resolve(JobResource).routes());
        this.app.use("/api/leads", authFunc, cont.resolve(LeadResource).routes());
        this.app.use("/api/leads-intake", apiKeyFunc, cont.resolve(LeadIntakeResource).routes());
        this.app.use("/api/leads-open", cont.resolve(LeadOpenResource).routes());
        this.app.use("/api/leads-form-input", authFunc, cont.resolve(LeadFormInputResource).routes());
        this.app.use("/api/logs", authFunc, cont.resolve(SendLogResource).routes());
        this.app.use("/api/users", authFunc, cont.resolve(UserResource).routes());
        this.app.use("/api/settings", authFunc,cont.resolve(SettingsResource).routes());
        this.app.use("/api/worker", authFunc,cont.resolve(WorkerResource).routes());
        this.app.use("/api/mock-vendor", cont.resolve(VendorReceiveResource).routes());
        this.app.use('/static', express.static('public'));

        // Initialize worker if IS_WORKER is true
        const settings = await cont.resolve(WorkerSettingsDAO).getCurrentSettings();

        if (settings.worker_enabled) {
            console.log("Worker is enabled (from DB settings)");
            this.worker = cont.resolve(Worker);
            await this.worker.initialize();
        } else {
            console.log("Worker is disabled (from DB settings)");
        }

        // catch all unhandled errors in the application
        process
            .on('unhandledRejection', (reason, p) => {
                console.error('Unhandled Rejection at:', p, '\nReason:', reason);
            })
            .on('uncaughtException', (error: Error) => {
                console.error(`Caught exception: ${error}\n` + `Exception origin: ${error.stack}`);
            });

        return this;
    }

    private registerIfNot<T>(container: DependencyContainer, thingToken: InjectionToken<T>, thing: T) {
        if (!container.isRegistered(thingToken)) {
            container.registerInstance(thingToken, thing);
        }
    }

    getApp() {
        return this.app;
    }

    // Optional: Add method to stop worker when needed
    async stop() {
        if (this.worker) {
            await this.worker.stop();
            this.worker = null;
        }
    }
}