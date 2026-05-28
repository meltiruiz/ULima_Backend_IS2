import { z } from "zod";

export const upsertStudentScoreSchema = z.object({
  enrollmentId: z.number().int().positive(),
  assessmentId: z.number().int().positive(),
  value: z.number().min(0).max(20).nullable(),
  comment: z.string().max(500).optional(),
});
