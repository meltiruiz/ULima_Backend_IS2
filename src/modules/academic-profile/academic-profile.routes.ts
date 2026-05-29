import { Hono } from "hono";
import type { AcademicProfileController } from "./academic-profile.controller";
import { authMiddleware } from "../../shared/middleware/auth-middleware";

export const createAcademicProfileRoutes = (controller: AcademicProfileController) => {
  const app = new Hono();

  app.use("*", authMiddleware);

  app.get("/me", (c) => controller.getProfile(c));
  app.get("/careers", (c) => controller.getCareers(c));
  app.get("/specialties", (c) => controller.getSpecialties(c));
  app.put("/me/specialties", (c) => controller.updateSpecialties(c));

  return app;
};
