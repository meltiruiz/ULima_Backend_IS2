import { env } from "./env";

export const config = {
  db: {
    url: env.DATABASE_URL,
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
  },
  server: {
    port: env.PORT,
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === "production",
    isDevelopment: env.NODE_ENV === "development",
  },
} as const;

export type AppConfig = typeof config;
