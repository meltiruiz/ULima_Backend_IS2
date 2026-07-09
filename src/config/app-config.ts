import { env } from "./env.js";

export const config = {
  db: {
    url: env.DATABASE_URL,
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    passwordResetMaxPerHour: env.PASSWORD_RESET_MAX_PER_HOUR,
  },
  email: {
    resendApiKey: env.RESEND_API_KEY,
    resendFrom: env.RESEND_FROM,
  },
  firebase: {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY,
    databaseUrl: env.FIREBASE_DATABASE_URL,
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
