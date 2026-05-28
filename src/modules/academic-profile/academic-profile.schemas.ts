import { z } from "zod";

export const selectCareerSchema = z.object({
  careerId: z.number().int().positive(),
  curriculumId: z.number().int().positive(),
});

export const selectSpecialtiesSchema = z.object({
  specialtyIds: z.array(z.number().int().positive()),
});
