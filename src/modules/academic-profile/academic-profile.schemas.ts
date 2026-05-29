import { z } from "zod";

export const selectCareerSchema = z.object({
  careerId: z.number().int().positive(),
  curriculumId: z.number().int().positive(),
});

export const selectSpecialtiesSchema = z.object({
  specialtyIds: z.array(z.number().int().positive()),
});

export const updateSpecialtiesSchema = z.object({
  primarySpecialtyId: z.number().int().positive().nullable().optional(),
  interestSpecialtyIds: z.array(z.number().int().positive()).optional().default([]),
});
