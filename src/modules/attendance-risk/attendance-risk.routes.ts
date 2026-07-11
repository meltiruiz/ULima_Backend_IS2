import { Hono } from "hono";
import type { AttendanceRiskController } from "./attendance-risk.controller.js";
import { authMiddleware, requireRole } from "../../shared/middleware/auth-middleware.js";

export const createAttendanceRiskRoutes = (controller: AttendanceRiskController) => {
  const app = new Hono();

  app.use("*", authMiddleware);
  app.use("*", requireRole("teacher"));

  app.get("/sections/:sectionId/attendance-risk", (c) =>
    controller.getAttendanceRisk(c)
  );

  app.get("/sections/:sectionId/attendance-risk/summary", (c) =>
    controller.getAttendanceRiskSummary(c)
  );

  app.post("/sections/:sectionId/attendance-risk/notify", (c) =>
    controller.notifyStudents(c)
  );

  return app;
};
