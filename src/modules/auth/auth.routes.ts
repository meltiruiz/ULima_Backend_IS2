import { Hono } from "hono";
import type { AuthController } from "./auth.controller.js";
import { validateJson } from "../../shared/middleware/validate-dto.js";
import { loginSchema } from "./auth.schemas.js";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import type { AppRole } from "./auth.types.js";

export const createAuthRoutes = (controller: AuthController) => {
  const app = new Hono<{ Variables: { userId: number; role: AppRole } }>();

  app.post("/login", async (c) => {
    const body = await validateJson(c, loginSchema);
    return c.json(await controller.login(body));
  });

  app.get("/me", authMiddleware, async (c) => {
    return c.json(await controller.me(Number(c.get("userId")), c.get("role") as AppRole));
  });

  app.post("/logout", authMiddleware, async (c) => {
    await controller.logout(Number(c.get("userId")));
    return c.json({ message: "Session closed" });
  });

  return app;
};
