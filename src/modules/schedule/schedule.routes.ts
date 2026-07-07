import { Hono } from "hono";
import type { ScheduleController } from "./schedule.controller.js";
import { authMiddleware, requireRole, STUDENT_ROLES } from "../../shared/middleware/auth-middleware.js";

export const createScheduleRoutes = (controller: ScheduleController) => {
  const app = new Hono<{ Variables: { studentId: number } }>();

  app.use("*", authMiddleware);
  app.use("*", requireRole(...STUDENT_ROLES));

  app.get("/me/sessions", (c) => controller.getSessions(c));
  app.get("/me/assessments", (c) => controller.getAssessments(c));
  app.get("/me/load", (c) => controller.getWeeklyLoad(c));

  return app;
};
