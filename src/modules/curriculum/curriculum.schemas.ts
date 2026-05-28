import { z } from "zod";

export const updateCourseProgressSchema = z.object({
  curriculumCourseId: z.number().int().positive(),
  status: z.enum(["locked", "available", "enrolled", "passed"]),
});
