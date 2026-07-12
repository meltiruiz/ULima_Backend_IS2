import { describe, expect, test } from "bun:test";
import { SimulatedGradesService } from "../src/modules/simulated-grades/simulated-grades.service.js";
import type { SimulatedGradesRepository } from "../src/modules/simulated-grades/simulated-grades.repository.js";
import type { EventBus } from "../src/events/index.js";

const noopEvents = {} as unknown as EventBus;

/** Repositorio falso: sin Postgres, con overrides por prueba. */
const fakeRepo = (over: Partial<SimulatedGradesRepository>): SimulatedGradesRepository =>
  ({
    findByStudent: async () => [],
    findEnrollmentForAssessment: async () => 1,
    upsert: async () => {},
    deleteByStudentAndAssessment: async () => 1,
    ...over,
  }) as unknown as SimulatedGradesRepository;

const expectHttpError = async (fn: () => Promise<unknown>, status: number, code: string) => {
  try {
    await fn();
    throw new Error(`se esperaba ${status} ${code} y no se lanzó`);
  } catch (e) {
    const err = e as { statusCode?: number; code?: string };
    expect(err.statusCode).toBe(status);
    expect(err.code).toBe(code);
  }
};

describe("SimulatedGradesService.upsertForStudent", () => {
  test("evaluaciones propias ⇒ upsert de cada una y devuelve la lista vigente", async () => {
    const upserts: Array<[number, number, number]> = [];
    const service = new SimulatedGradesService(
      fakeRepo({
        findEnrollmentForAssessment: async (_s, aId) => (aId === 10 ? 5 : 7),
        upsert: async (eId, aId, v) => {
          upserts.push([eId, aId, v]);
        },
        findByStudent: async () => [
          { assessmentId: 10, sectionId: 3, value: "15.50" },
          { assessmentId: 20, sectionId: 4, value: "12.00" },
        ],
      }),
      noopEvents,
    );

    const result = await service.upsertForStudent(2, [
      { assessmentId: 10, value: 15.5 },
      { assessmentId: 20, value: 12 },
    ]);

    expect(upserts).toEqual([
      [5, 10, 15.5],
      [7, 20, 12],
    ]);
    expect(result).toEqual([
      { assessmentId: 10, sectionId: 3, value: 15.5 },
      { assessmentId: 20, sectionId: 4, value: 12 },
    ]);
  });

  test("evaluación ajena (sin matrícula) ⇒ 404 y no escribe nada", async () => {
    let upsertCalls = 0;
    const service = new SimulatedGradesService(
      fakeRepo({
        findEnrollmentForAssessment: async (_s, aId) => (aId === 99 ? null : 1),
        upsert: async () => {
          upsertCalls += 1;
        },
      }),
      noopEvents,
    );

    await expectHttpError(
      () => service.upsertForStudent(2, [{ assessmentId: 10, value: 14 }, { assessmentId: 99, value: 8 }]),
      404,
      "ASSESSMENT_NOT_ENROLLED",
    );
    // Validación de TODO el lote antes de escribir ⇒ no persiste parcialmente.
    expect(upsertCalls).toBe(0);
  });
});

describe("SimulatedGradesService.deleteForStudent", () => {
  test("existe ⇒ borra sin error", async () => {
    const service = new SimulatedGradesService(
      fakeRepo({ deleteByStudentAndAssessment: async () => 1 }),
      noopEvents,
    );
    await service.deleteForStudent(2, 10);
  });

  test("no existe ⇒ 404 SIMULATED_GRADE_NOT_FOUND", async () => {
    const service = new SimulatedGradesService(
      fakeRepo({ deleteByStudentAndAssessment: async () => 0 }),
      noopEvents,
    );
    await expectHttpError(() => service.deleteForStudent(2, 10), 404, "SIMULATED_GRADE_NOT_FOUND");
  });
});

describe("SimulatedGradesService.listForStudent", () => {
  test("convierte value string(decimal) a number", async () => {
    const service = new SimulatedGradesService(
      fakeRepo({ findByStudent: async () => [{ assessmentId: 10, sectionId: 3, value: "18.25" }] }),
      noopEvents,
    );
    const result = await service.listForStudent(2);
    expect(result).toEqual([{ assessmentId: 10, sectionId: 3, value: 18.25 }]);
  });
});
