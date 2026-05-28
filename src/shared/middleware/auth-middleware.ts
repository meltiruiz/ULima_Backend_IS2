import type { MiddlewareHandler } from "hono";

export type AuthVariables = {
  userId: number;
  role: string;
};

export const authMiddleware: MiddlewareHandler = async (_c, next) => {
  await next();
};
