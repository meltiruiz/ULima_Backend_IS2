import { Hono } from "hono";
import type { SimulatedGradesController } from "./simulated-grades.controller.js";
import { authMiddleware, requireRole, STUDENT_ROLES } from "../../shared/middleware/auth-middleware.js";

export const createSimulatedGradesRoutes = (controller: SimulatedGradesController) => {
  const app = new Hono();

  // Notas simuladas de la calculadora: solo el propio alumno (JWT).
  app.use("*", authMiddleware);
  app.use("*", requireRole(...STUDENT_ROLES));

  app.get("/me", (c) => controller.list(c));
  app.put("/me", (c) => controller.upsert(c));
  app.delete("/me/:assessmentId", (c) => controller.remove(c));

  return app;
};
