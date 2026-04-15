import { loadEnvConfig } from "@next/env";
import dotenv from "dotenv";
import { join } from "node:path";
import mongoose from "mongoose";

// Next CLI loads env for the dev server, but API route bundles can still see empty
// process.env.* for non-NEXT_PUBLIC vars under Turbopack. Load explicitly from disk.
const projectRoot = process.cwd();
loadEnvConfig(projectRoot);
dotenv.config({ path: join(projectRoot, ".env.local"), override: true });
dotenv.config({ path: join(projectRoot, ".env"), override: false });

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

function pickEnv(name) {
    const v = process.env[name];
    return typeof v === "string" && v.trim() ? v.trim() : "";
}

function getMongoUri() {
    return (
        pickEnv("NEXT_MONGODB_URI") ||
        pickEnv("MONGODB_URI") ||
        pickEnv("DATABASE_URL") ||
        pickEnv("MONGODB_URL") ||
        ""
    );
}

const connectDB = async () => {
    const uri = getMongoUri();
    if (!uri) {
        throw new Error(
            "No MongoDB URI found. Add NEXT_MONGODB_URI (or MONGODB_URI / DATABASE_URL) to .env.local next to package.json, then restart npm run dev."
        );
    }

    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose
            .connect(uri, {
                dbName: "fitness_database",
            })
            .then((mongoose) => mongoose);
    }

    cached.conn = await cached.promise;
    return cached.conn;
};

export { connectDB };
