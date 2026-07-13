import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, requireRole } from "../../shared/middleware/auth-middleware.js";
import { validateJson } from "../../shared/middleware/validate-dto.js";
import { HttpError } from "../../shared/errors/http-error.js";
import type { ChatController } from "./chat.controller.js";
import { chatTokenSchema } from "./chat.schemas.js";

export const deleteParamsSchema = z.object({
  sectionId: z.coerce.number().int().positive(),
  messageId: z.string().min(1).max(200),
});

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

  // HU23: eliminar (borrado suave) un mensaje. Solo docentes; el controller
  // valida además que sea el PROFESOR titular de esa sección.
  app.delete("/sections/:sectionId/messages/:messageId", requireRole("teacher"), async (c) => {
    const parsed = deleteParamsSchema.safeParse({
      sectionId: c.req.param("sectionId"),
      messageId: c.req.param("messageId"),
    });
    if (!parsed.success) {
      throw new HttpError(400, "Parámetros inválidos.", "INVALID_ROUTE_PARAMS", parsed.error.flatten());
    }

    return c.json(await controller.deleteMessage({
      sectionId: parsed.data.sectionId,
      messageId: parsed.data.messageId,
      userId: c.get("userId"),
      teacherId: c.get("teacherId"),
    }));
  });

  return app;
};
