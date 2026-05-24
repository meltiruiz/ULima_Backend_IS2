import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../config/app-config";
import * as schema from "./schema";
import * as relations from "./relations";

const client = postgres(config.db.url);
export const db = drizzle(client, { schema: { ...schema, ...relations } });
