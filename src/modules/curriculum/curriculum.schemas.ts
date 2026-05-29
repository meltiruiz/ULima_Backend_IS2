import { z } from "zod";

export const updateCourseProgressSchema = z.object({
  curriculumCourseId: z.number().int().positive(),
  status: z.enum(["locked", "available", "enrolled", "passed"]),
});

export const updateSimulationSchema = z.object({
  curriculumCourseId: z.number().int().positive(),
  status: z.enum(["planned", "simulated_completed"]),
});
