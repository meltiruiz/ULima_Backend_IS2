import { Hono } from "hono";
import type { AlertsController } from "./alerts.controller";
import { authMiddleware } from "../../shared/middleware/auth-middleware";

export const createAlertsRoutes = (controller: AlertsController) => {
  const app = new Hono();

  app.use("*", authMiddleware);

  app.get("/me", (c) => controller.getAlerts(c));
  app.put("/me/:alertId/read", (c) => controller.markRead(c));

  return app;
};

