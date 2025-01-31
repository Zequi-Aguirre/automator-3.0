import axios from "axios";
import config from "./config";

export class AxiosProvider {

    // Implement your logic to retrieve the token from storage (e.g., localStorage or cookies)
    getApi(authHeader = true) {
        const axiosConfig = { baseURL: config.baseUrl, withCredentials: true };
        const instance = axios.create(
            !authHeader
                ? axiosConfig
                : { ...axiosConfig, headers: this.getAuthorization() }
        );

        instance.interceptors.request.use(
            (config) => {
                const token = this.getToken();
                if (token) {
                    config.headers.Authorization = "Bearer " + token;
                }
                return config;
            },
            async (error) => {
                return await Promise.reject(error);
            }
        );

        instance.interceptors.response.use(
            async (res) => {
                const newToken = res.request.getResponseHeader("New-Token");
                if (newToken) {
                    this.removeToken();
                    this.setToken(newToken);
                    delete instance.defaults.headers.common["New-Token"];
                }
                return res;
            },
            async (err) => {
                if (err.response.status === 405) {
                    this.removeToken();
                    window.location.href = '/login?sessionExpired=true';
                }
                return await Promise.reject(err);
            }
        );

        return instance;
    }

    getAuthorization() {
        return { Authorization: `Bearer ${this.getToken()}` };
    }

    setToken(token: string) {
        localStorage.setItem("token", token);
    }

    getToken() {
        return localStorage.getItem("token");
    }

    removeToken() {
        localStorage.removeItem("token");
    }

}

export const authProvider = new AxiosProvider();
