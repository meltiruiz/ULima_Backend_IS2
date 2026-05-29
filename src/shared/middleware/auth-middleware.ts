import type { MiddlewareHandler } from "hono";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { config } from "../../config/app-config";
import { HttpError } from "../errors/http-error";

export type AuthVariables = {
  userId: number;
  role: string;
};

const isPayload = (payload: string | JwtPayload): payload is JwtPayload =>
  typeof payload !== "string";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authorization = c.req.header("Authorization");
  if (!authorization) {
    throw new HttpError(401, "No se envió token de autenticación.", "MISSING_TOKEN");
  }

  const [type, token] = authorization.split(" ");
  if (type !== "Bearer" || !token) {
    throw new HttpError(401, "Token de autenticación inválido.", "INVALID_TOKEN");
  }

  try {
    const payload = jwt.verify(token, config.auth.jwtSecret);
    if (!isPayload(payload)) {
      throw new HttpError(401, "Token de autenticación inválido.", "INVALID_TOKEN");
    }

    const userId = Number(payload.sub);
    const role = payload.role;
    if (!Number.isInteger(userId) || typeof role !== "string") {
      throw new HttpError(401, "Token de autenticación inválido.", "INVALID_TOKEN");
    }

    c.set("userId", userId);
    c.set("role", role);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "Token de autenticación inválido o expirado.", "INVALID_TOKEN");
  }

  await next();
};
