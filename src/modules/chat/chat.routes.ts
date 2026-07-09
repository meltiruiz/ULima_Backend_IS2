import { Hono } from "hono";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import type { ChatController } from "./chat.controller.js";

export const createChatRoutes = (controller: ChatController) => {
  const app = new Hono<{ Variables: { userId: string; role: string } }>();

  app.use("*", authMiddleware);

  app.get("/firebase-token", async (c) => {
    const userId = Number(c.get("userId"));
    const role = c.get("role");
    
    try {
      const result = await controller.getFirebaseToken(userId, role);
      return c.json(result);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  return app;
};
