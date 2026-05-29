import { Hono } from "hono";
import type { AuthController } from "./auth.controller";
import { validateJson } from "../../shared/middleware/validate-dto";
import { loginSchema } from "./auth.schemas";
import { authMiddleware } from "../../shared/middleware/auth-middleware";
import type { AppRole } from "./auth.types";

export const createAuthRoutes = (controller: AuthController) => {
  const app = new Hono<{ Variables: { userId: number; role: AppRole } }>();

  app.post("/login", async (c) => {
    const body = await validateJson(c, loginSchema);
    return c.json(await controller.login(body));
  });

  app.get("/me", authMiddleware, async (c) => {
    return c.json(await controller.me(Number(c.get("userId")), c.get("role") as AppRole));
  });

  app.post("/logout", authMiddleware, (c) => c.json({ message: "Session closed" }));

  return app;
};
