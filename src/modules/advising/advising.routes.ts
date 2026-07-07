import { Hono } from "hono";
import type { AdvisingController } from "./advising.controller.js";
import { authMiddleware, requireRole } from "../../shared/middleware/auth-middleware.js";

export const createAdvisingRoutes = (controller: AdvisingController) => {
  const app = new Hono<{ Variables: { teacherId: number; role: string } }>();

  // Solo docentes (profesor/JP). Un token de alumno recibe 403.
  app.use("*", authMiddleware);
  app.use("*", requireRole("teacher"));

  app.get("/me/sections", (c) => controller.getSections(c));
  app.get("/me/sessions", (c) => controller.getSessions(c));
  app.post("/me/sessions", (c) => controller.createSession(c));
  app.delete("/me/sessions/:id", (c) => controller.deleteSession(c));
  app.get("/me/sessions/:id/attendees", (c) => controller.getAttendees(c));

  return app;
};
