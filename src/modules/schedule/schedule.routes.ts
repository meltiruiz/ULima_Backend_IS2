import { Hono } from "hono";
import type { ScheduleController } from "./schedule.controller";
import { authMiddleware } from "../../shared/middleware/auth-middleware";

export const createScheduleRoutes = (controller: ScheduleController) => {
  const app = new Hono<{ Variables: { studentId: number } }>();

  app.get("/me/sessions", authMiddleware, (c) => controller.getSessions(c));
  app.get("/me/assessments", authMiddleware, (c) => controller.getAssessments(c));
  app.get("/me/load", authMiddleware, (c) => controller.getWeeklyLoad(c));

  return app;
};
