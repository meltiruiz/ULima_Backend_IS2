import { Hono } from "hono";
import {
  authMiddleware,
  requireRole,
  STUDENT_ROLES,
  type AuthVariables,
} from "../../shared/middleware/auth-middleware.js";
import type { NetworkingController } from "./networking.controller.js";

export const createNetworkingRoutes = (controller: NetworkingController) => {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.use("*", authMiddleware);
  app.use("*", requireRole(...STUDENT_ROLES, "teacher"));
  app.get("/me", (c) => controller.getMine(c));
  app.put("/me", (c) => controller.updateMine(c));

  return app;
};
