import { Hono } from "hono";
import type { AcademicProfileController } from "./academic-profile.controller.js";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import type { AppRole } from "./academic-profile.types.js";

export const createAcademicProfileRoutes = (controller: AcademicProfileController) => {
  const app = new Hono<{ Variables: { userId: number; role: AppRole } }>();

  app.get("/me", authMiddleware, (c) => controller.getProfile(c));
  app.get("/careers", authMiddleware, (c) => controller.getCareers(c));
  app.get("/specialties", authMiddleware, (c) => controller.getSpecialties(c));
  app.put("/me/specialties", authMiddleware, (c) => controller.updateSpecialties(c));

  return app;
};
