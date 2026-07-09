import { Hono } from "hono";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { validateJson } from "../../shared/middleware/validate-dto.js";
import type { ChatController } from "./chat.controller.js";
import { chatTokenSchema } from "./chat.schemas.js";

export const createChatRoutes = (controller: ChatController) => {
  const app = new Hono<{
    Variables: {
      userId: number;
      studentId?: number;
      teacherId?: number;
      role: string;
    };
  }>();

  app.use("*", authMiddleware);

  app.post("/token", async (c) => {
    const body = await validateJson(c, chatTokenSchema);

    return c.json(await controller.createFirebaseToken({
      sectionId: body.sectionId,
      userId: c.get("userId"),
      studentId: c.get("studentId"),
      teacherId: c.get("teacherId"),
      role: c.get("role"),
    }));
  });

  return app;
};
