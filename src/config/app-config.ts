import { env } from "./env.js";

export const config = {
  db: {
    url: env.DATABASE_URL,
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
  },
  server: {
    port: env.PORT,
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === "production",
    isDevelopment: env.NODE_ENV === "development",
    corsOrigins: env.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [],
  },
} as const;

export type AppConfig = typeof config;
