import express, { Express } from "express";
import logger from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";

const ALLOWED_ORIGINS = process.env["VITE_ALLOWED_ORIGINS"];

console.log("ALLOWED_ORIGINS", ALLOWED_ORIGINS);

// Middleware configuration
export const appConfig = (app: Express) => {
    // Ensure ALLOWED_ORIGINS is properly parsed as an array
    const allowedOriginsArray = ALLOWED_ORIGINS
        ? ALLOWED_ORIGINS.split(",").map(origin => origin.trim())
        : [];

    console.log("Parsed Allowed Origins:", allowedOriginsArray);

    // Because this will be hosted on a server that will accept requests from outside and it will be hosted on a server with a `proxy`, express needs to know that it should trust that setting.
    // Services like Fly use something called a proxy, and you need to add this to your server
    app.set("trust proxy", 1);

    // Configure CORS
    app.use(
        cors({
            origin: (origin, callback) => {
                // Allow requests with no origin (like mobile apps or curl)
                if (!origin || allowedOriginsArray.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error(`Not allowed by CORS: ${origin}`));
                }
            },
            credentials: true,
            exposedHeaders: ["New-Token"],
        })
    );

    // In development environment the app logs
    app.use(logger("dev"));

    // To have access to `body` property in the request
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
};