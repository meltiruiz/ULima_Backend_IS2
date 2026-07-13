import { describe, expect, test } from "bun:test";
import type { EventBus } from "../../src/events/index.js";
import type { GradesRepository } from "../../src/modules/grades/grades.repository.js";
import { GradesService } from "../../src/modules/grades/grades.service.js";

/**
 * ============================================================================
 * CAJA BLANCA — GradesService.saveNotas() + deleteNota() (HU06: registrar notas)
 * Fuente: src/modules/grades/grades.service.ts:79-94
 * ============================================================================
 * Leyendo el fuente: cuando findEnrollmentId() devuelve null, saveNotas hace
 * `continue` y DESCARTA EN SILENCIO las notas de esa sección — la respuesta
 * HTTP sigue siendo 200 en ambos casos, así que esta rama es invisible desde
 * el contrato y solo se puede verificar espiando las llamadas al repositorio.
 *
 * NODOS/PREDICADOS de saveNotas():
 *   P1  for (curso of body.cursos)          (0..n iteraciones)
 *   P2  if (enrollmentId == null) continue  (sin matrícula activa)
 *   P3  for (nota of curso.notas)           (0..m upserts)
 * deleteNota(): P4  if (enrollmentId == null) return
 *
 * V(G) saveNotas = 3 decisiones + 1 = 4 · deleteNota = 2  ⇒ un test por camino:
 *
 * | # | Camino                                   | Esperado                        |
 * |---|-------------------------------------------|---------------------------------|
 * | C1| cursos: [] (P1 no itera)                  | 0 upserts, resuelve sin lanzar  |
 * | C2| P2(V): sección sin matrícula              | 0 upserts (descarte silencioso) |
 * | C3| P2(F)→P3: matriculado con 2 notas         | 2 upserts con el enrollment 501 |
 * | C4| mixto: [sin matrícula, matriculado]       | upserts SOLO del matriculado    |
 * | C5| deleteNota P4(V): sin matrícula           | 0 deletes                       |
 * | C6| deleteNota P4(F): matriculado             | 1 delete exacto                 |
 *
 * Flujo de datos (criterio todos-los-usos): el par def-uso de `enrollmentId`
 * (def :81 / uso :85) se verifica comprobando que upsertScore recibe el id
 * devuelto por findEnrollmentId, no el sectionId ni otro valor.
 */

const noopEvents = {} as unknown as EventBus;

type Upsert = { enrollmentId: number; assessmentId: number; valor: number | null };
type Delete = { enrollmentId: number; assessmentId: number };

// Repositorio ESPÍA: matrícula por sectionId (ausente = no matriculado) y
// registro de cada llamada para las aserciones de interacción.
const spyRepo = (enrollments: Record<number, number>) => {
  const upserts: Upsert[] = [];
  const deletes: Delete[] = [];
  const repo = {
    findEnrollmentId: async (_studentId: number, sectionId: number) =>
      enrollments[sectionId] ?? null,
    upsertScore: async (enrollmentId: number, assessmentId: number, valor: number | null) => {
      upserts.push({ enrollmentId, assessmentId, valor });
    },
    deleteScore: async (enrollmentId: number, assessmentId: number) => {
      deletes.push({ enrollmentId, assessmentId });
    },
  } as unknown as GradesRepository;
  return { repo, upserts, deletes };
};

describe("CAJA BLANCA · GradesService.saveNotas (HU06)", () => {
  test("C1: lista de cursos vacía -> no consulta matrícula ni escribe nada", async () => {
    const { repo, upserts } = spyRepo({ 42: 501 });
    await new GradesService(repo, noopEvents).saveNotas(7, { cursos: [] });
    expect(upserts).toHaveLength(0);
  });

  test("C2: sección sin matrícula -> continue silencioso, 0 upserts y sin excepción", async () => {
    const { repo, upserts } = spyRepo({});
    const service = new GradesService(repo, noopEvents);

    await service.saveNotas(7, {
      cursos: [{ sectionId: 42, notas: [{ assessmentId: 1, valor: 15 }] }],
    });

    expect(upserts).toHaveLength(0);
  });

  test("C3: matriculado con 2 notas -> un upsert por nota con el enrollmentId correcto", async () => {
    const { repo, upserts } = spyRepo({ 42: 501 });
    const service = new GradesService(repo, noopEvents);

    await service.saveNotas(7, {
      cursos: [
        {
          sectionId: 42,
          notas: [
            { assessmentId: 1, valor: 15 },
            { assessmentId: 2, valor: 12.5 },
          ],
        },
      ],
    });

    expect(upserts).toEqual([
      { enrollmentId: 501, assessmentId: 1, valor: 15 },
      { enrollmentId: 501, assessmentId: 2, valor: 12.5 },
    ]);
  });

  test("C4: mezcla matriculado/no matriculado -> solo persiste la sección con matrícula", async () => {
    const { repo, upserts } = spyRepo({ 42: 501 });
    const service = new GradesService(repo, noopEvents);

    await service.saveNotas(7, {
      cursos: [
        { sectionId: 99, notas: [{ assessmentId: 9, valor: 20 }] }, // sin matrícula
        { sectionId: 42, notas: [{ assessmentId: 1, valor: 15 }] }, // matriculado
      ],
    });

    expect(upserts).toEqual([{ enrollmentId: 501, assessmentId: 1, valor: 15 }]);
  });
});

describe("CAJA BLANCA · GradesService.deleteNota (HU06)", () => {
  test("C5: sin matrícula -> early return, no borra nada", async () => {
    const { repo, deletes } = spyRepo({});
    await new GradesService(repo, noopEvents).deleteNota(7, 42, 1);
    expect(deletes).toHaveLength(0);
  });

  test("C6: matriculado -> borra exactamente la nota (enrollmentId + assessmentId)", async () => {
    const { repo, deletes } = spyRepo({ 42: 501 });
    await new GradesService(repo, noopEvents).deleteNota(7, 42, 1);
    expect(deletes).toEqual([{ enrollmentId: 501, assessmentId: 1 }]);
  });
});
