import { Hono } from "hono";
import type { AuthController } from "./auth.controller";
import { validateJson } from "../../shared/middleware/validate-dto";
import { loginSchema } from "./auth.schemas";

export const createAuthRoutes = (controller: AuthController) => {
  const app = new Hono();

  app.post("/login", async (c) => {
    const body = await validateJson(c, loginSchema);
    return c.json(await controller.login(body));
  });

  app.get("/me", async (c) => {
    const auth = c.req.header("Authorization");
    const bearerCode = auth?.startsWith("Bearer dev-") ? auth.slice("Bearer dev-".length) : null;
    const code = c.req.query("code") ?? c.req.header("X-User-Code") ?? bearerCode;
    if (!code) return c.json({ error: { code: "MISSING_CODE", message: "Send code query, X-User-Code, or Bearer dev-{code}" } }, 400);
    return c.json(await controller.me(code));
  });

  app.post("/logout", (c) => c.json({ message: "Session closed" }));

  return app;
};
