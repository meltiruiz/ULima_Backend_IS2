import type { MiddlewareHandler } from "hono";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { config } from "../../config/app-config.js";
import { HttpError } from "../errors/http-error.js";

export type AuthVariables = {
  userId: number;
  studentId: number;
  role: string;
};

const isPayload = (payload: string | JwtPayload): payload is JwtPayload =>
  typeof payload !== "string";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  // Autenticación exclusivamente por JWT Bearer. No se aceptan códigos por
  // query (`?code=`), header `X-User-Code` ni el prefijo `Bearer dev-`:
  // esas vías permitían suplantar a cualquier usuario sin credenciales.
  const auth = c.req.header("Authorization");
  if (!auth) {
    throw new HttpError(401, "No se envió token de autenticación.", "MISSING_TOKEN");
  }

  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token) {
    throw new HttpError(401, "Token de autenticación inválido.", "INVALID_TOKEN");
  }

  try {
    const payload = jwt.verify(token, config.auth.jwtSecret);
    if (!isPayload(payload)) {
      throw new HttpError(401, "Token de autenticación inválido.", "INVALID_TOKEN");
    }

    const userId = Number(payload.sub);
    const studentId = Number(payload.studentId);
    const role = payload.role;
    const tokenVersion = Number(payload.tokenVersion);
    if (!Number.isInteger(userId) || !Number.isInteger(studentId) || typeof role !== "string" || !Number.isInteger(tokenVersion)) {
      throw new HttpError(401, "Token de autenticación inválido.", "INVALID_TOKEN");
    }

    // Validar tokenVersion contra la BD (Single Active Session).
    const result = await db.execute(sql`
      select token_version from app_user where id = ${userId} limit 1
    `) as unknown as Array<{ token_version: number }>;

    const dbTokenVersion = result[0]?.token_version;
    if (dbTokenVersion == null || dbTokenVersion !== tokenVersion) {
      throw new HttpError(401, "Token de autenticación revocado o inválido.", "INVALID_TOKEN");
    }

    c.set("userId", userId);
    c.set("studentId", studentId);
    c.set("role", role);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "Token de autenticación inválido o expirado.", "INVALID_TOKEN");
  }

  await next();
};
