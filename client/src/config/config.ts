export class Config {
   constructor(public readonly baseUrl: string) {}
}

const serverUrl = import.meta.env.VITE_SERVER_URL;

const config = new Config(serverUrl);
export default config;