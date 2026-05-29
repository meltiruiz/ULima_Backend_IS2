import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL debe ser una URL de conexión válida de PostgreSQL"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET debe tener al menos 8 caracteres"),
  JWT_EXPIRES_IN: z.string().optional()
    .transform((v) => parseInt(v ?? "86400", 10))
    .refine((v) => Number.isInteger(v) && v > 0, "JWT_EXPIRES_IN debe ser un entero positivo"),
  PORT: z.string().optional().transform((v) => parseInt(v ?? "3000", 10)),
  NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Error de validación en las variables de entorno:");
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
