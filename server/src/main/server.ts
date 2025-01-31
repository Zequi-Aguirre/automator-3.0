import { AutomatorServer } from "./AutomatorServer.ts";
import { EnvConfig } from "./config/envConfig.ts";
import { DBContainer } from "./config/DBContainer.ts";
import { MongoDBContainer } from "./config/mongoDBContainer.ts";
import { container } from "tsyringe";
import "reflect-metadata"; // Make sure this is imported at the entry point

const PORT = process.env.PORT || 5005;

try {
    const config = new EnvConfig();
    container.registerInstance(DBContainer, new DBContainer(config.dbConfig));
    container.registerInstance(MongoDBContainer, new MongoDBContainer(config.mongoUri));
    (async () => {
        const server = await new AutomatorServer(
            container,
            config
        ).setup();

        const app = server.getApp();
        app.listen(PORT, () => {
            console.log(`Server listening on http://localhost:${PORT}!`);
        });
    })();

} catch (error) {
    console.error('App initialization error:', error);
}