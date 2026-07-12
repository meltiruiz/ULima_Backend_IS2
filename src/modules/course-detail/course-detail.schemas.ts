import { z } from "zod";

export const sectionIdParamSchema = z.object({
  sectionId: z.coerce.number().int().positive(),
});

// HU17: identificador de la asesoría en los endpoints de RSVP del alumno.
export const advisingSessionIdParamSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
});
