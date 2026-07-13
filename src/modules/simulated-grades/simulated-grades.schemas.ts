import { z } from "zod";

// Una nota simulada: la evaluación (assessment.id) y el valor 0..20.
export const simulatedGradeEntrySchema = z.object({
  assessmentId: z.number().int().positive(),
  value: z.number().min(0).max(20),
});

// Upsert por lote: la calculadora guarda varias notas de un curso a la vez.
export const upsertSimulatedGradesSchema = z.object({
  grades: z.array(simulatedGradeEntrySchema).min(1).max(200),
});

export type SimulatedGradeEntry = z.infer<typeof simulatedGradeEntrySchema>;
