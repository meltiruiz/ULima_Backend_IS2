import { Hono } from "hono";
import type { CurriculumController } from "./curriculum.controller";
import { authMiddleware } from "../../shared/middleware/auth-middleware";

export const createCurriculumRoutes = (controller: CurriculumController) => {
  const app = new Hono();

  app.use("*", authMiddleware);

  app.get("/me", (c) => controller.getCurriculum(c));
  app.put("/me/simulation", (c) => controller.updateSimulation(c));
  app.delete("/me/simulation/:curriculumCourseId", (c) => controller.deleteSimulation(c));

  return app;
};
