import { z } from "zod";

/** Body de creación de asesoría extra (POST /advising/me/sessions). */
export const createAdvisingSchema = z.object({
  sectionId: z.coerce.number().int().positive(),
  // Fecha ISO "YYYY-MM-DD".
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)."),
  // Hora "HH:MM" (acepta segundos opcionales).
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Hora de inicio inválida (HH:MM)."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Hora de fin inválida (HH:MM)."),
  modality: z.enum(["classroom", "virtual", "hybrid"]),
  classroom: z.string().max(100).trim().optional(),
  meetingUrl: z.string().max(255).trim().optional(),
  note: z.string().max(1000).trim().optional(),
  capacity: z.coerce.number().int().positive().optional(),
});

export type CreateAdvisingBody = z.infer<typeof createAdvisingSchema>;

/** Param :id de una asesoría. */
export const advisingIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** Param :sectionId de la ruta pública GET /section/:sectionId. */
export const sectionIdParamSchema = z.object({
  sectionId: z.coerce.number().int().positive(),
});
