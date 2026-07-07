// Lógica pura de alertas (HU08). Sin acceso a BD ni efectos: todo testeable con
// `bun test`. Aísla los umbrales de riesgo académico y la agregación de notas
// por curso para poder verificarlos (caja blanca: bordes de los umbrales).

/** Riesgo académico: avance evaluado (% de peso calificado) por encima de este umbral… */
export const ACADEMIC_RISK_MIN_PROGRESS = 55;
/** …y promedio personal (nota /20) por debajo de este otro. */
export const ACADEMIC_RISK_MAX_AVERAGE = 10.5;

export type ScoreRow = {
  course_id: number;
  course_name: string;
  assessment_id: number | null;
  assessment_weight: number | string | null;
  score_value: number | string | null;
};

export type CourseAggregate = {
  courseId: number;
  name: string;
  gradedWeight: number; // suma de pesos de las evaluaciones ya calificadas (%)
  weightedSum: number; // suma de (nota * peso)
  numExamenes: number;
};

/** Agrupa las filas por curso y acumula peso calificado y suma ponderada.
 *  Ignora filas sin evaluación o sin nota (assessment_id/score_value null). */
export function aggregateCourseScores(rows: ScoreRow[]): CourseAggregate[] {
  const groups = new Map<number, CourseAggregate>();
  for (const row of rows) {
    if (!groups.has(row.course_id)) {
      groups.set(row.course_id, {
        courseId: row.course_id,
        name: row.course_name,
        gradedWeight: 0,
        weightedSum: 0,
        numExamenes: 0,
      });
    }
    const g = groups.get(row.course_id)!;
    if (row.assessment_id !== null && row.score_value !== null) {
      const weight = Number(row.assessment_weight || 0);
      const value = Number(row.score_value);
      g.gradedWeight += weight;
      g.weightedSum += value * weight;
      g.numExamenes += 1;
    }
  }
  return [...groups.values()];
}

/** Promedio personal ponderado sobre lo ya calificado (0 si no hay avance). */
export function personalAverage(gradedWeight: number, weightedSum: number): number {
  return gradedWeight > 0 ? weightedSum / gradedWeight : 0;
}

/** True si el curso está en riesgo académico según ambos umbrales. */
export function isAcademicRisk(gradedWeight: number, weightedSum: number): boolean {
  return (
    gradedWeight > ACADEMIC_RISK_MIN_PROGRESS &&
    personalAverage(gradedWeight, weightedSum) < ACADEMIC_RISK_MAX_AVERAGE
  );
}
