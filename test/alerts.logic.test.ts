// Pruebas de la lógica pura de alertas (HU08). Cubren la agregación de notas
// por curso y los BORDES de los umbrales de riesgo académico (avance > 55% y
// promedio < 10.5) — la parte que la app usa para decidir si alertar.

import { describe, expect, test } from "bun:test";
import {
  ACADEMIC_RISK_MAX_AVERAGE,
  ACADEMIC_RISK_MIN_PROGRESS,
  aggregateCourseScores,
  isAcademicRisk,
  personalAverage,
  type ScoreRow,
} from "../src/modules/alerts/alerts.logic.js";

const row = (over: Partial<ScoreRow>): ScoreRow => ({
  course_id: 1,
  course_name: "Curso",
  assessment_id: 10,
  assessment_weight: 20,
  score_value: 15,
  ...over,
});

describe("aggregateCourseScores", () => {
  test("agrupa por curso y acumula peso y suma ponderada", () => {
    const out = aggregateCourseScores([
      row({ course_id: 1, assessment_id: 1, assessment_weight: 30, score_value: 12 }),
      row({ course_id: 1, assessment_id: 2, assessment_weight: 20, score_value: 8 }),
      row({ course_id: 2, name: "Otro", course_name: "Otro", assessment_id: 3, assessment_weight: 40, score_value: 14 }),
    ]);
    const c1 = out.find((g) => g.courseId === 1)!;
    expect(c1.gradedWeight).toBe(50);
    expect(c1.weightedSum).toBe(30 * 12 + 20 * 8);
    expect(c1.numExamenes).toBe(2);
    expect(out).toHaveLength(2);
  });

  test("ignora filas sin evaluación o sin nota", () => {
    const out = aggregateCourseScores([
      row({ assessment_id: null, assessment_weight: 30, score_value: null }),
      row({ assessment_id: 5, score_value: null }),
      row({ assessment_id: 6, assessment_weight: 25, score_value: 16 }),
    ]);
    expect(out[0].gradedWeight).toBe(25);
    expect(out[0].numExamenes).toBe(1);
  });

  test("acepta pesos/notas como string (numéricos de postgres)", () => {
    const out = aggregateCourseScores([
      row({ assessment_weight: "40", score_value: "13" }),
    ]);
    expect(out[0].gradedWeight).toBe(40);
    expect(out[0].weightedSum).toBe(40 * 13);
  });
});

describe("personalAverage", () => {
  test("promedio ponderado sobre lo calificado", () => {
    expect(personalAverage(50, 30 * 12 + 20 * 8)).toBeCloseTo((360 + 160) / 50);
  });
  test("0 si no hay avance calificado", () => {
    expect(personalAverage(0, 0)).toBe(0);
  });
});

describe("isAcademicRisk (bordes de los umbrales)", () => {
  test("constantes esperadas", () => {
    expect(ACADEMIC_RISK_MIN_PROGRESS).toBe(55);
    expect(ACADEMIC_RISK_MAX_AVERAGE).toBe(10.5);
  });

  test("avance exactamente 55% NO es riesgo (se exige > 55)", () => {
    // avg = 8 (< 10.5) pero avance = 55 exacto → no dispara
    expect(isAcademicRisk(55, 55 * 8)).toBe(false);
  });

  test("avance 56% y promedio 10.0 → riesgo", () => {
    expect(isAcademicRisk(56, 56 * 10)).toBe(true);
  });

  test("promedio exactamente 10.5 NO es riesgo (se exige < 10.5)", () => {
    expect(isAcademicRisk(60, 60 * 10.5)).toBe(false);
  });

  test("promedio 10.49 con avance alto → riesgo", () => {
    expect(isAcademicRisk(60, 60 * 10.49)).toBe(true);
  });

  test("promedio 11 (aprobando) → no riesgo aunque el avance sea alto", () => {
    expect(isAcademicRisk(80, 80 * 11)).toBe(false);
  });

  test("sin avance calificado → no riesgo", () => {
    expect(isAcademicRisk(0, 0)).toBe(false);
  });
});
