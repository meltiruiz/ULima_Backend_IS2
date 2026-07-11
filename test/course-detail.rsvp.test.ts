import { describe, expect, test } from "bun:test";
import type { Context } from "hono";
import { CourseDetailController } from "../src/modules/course-detail/course-detail.controller.js";
import { CourseDetailService } from "../src/modules/course-detail/course-detail.service.js";
import type { CourseDetailRepository } from "../src/modules/course-detail/course-detail.repository.js";
import type { EventBus } from "../src/events/index.js";
import type { RawAdvisingRow } from "../src/modules/course-detail/course-detail.types.js";

// ─── Dobles de prueba ────────────────────────────────────────────────────────

const noopEvents = {} as unknown as EventBus;

/** Repositorio falso: sin Postgres, con contadores de llamadas para caja blanca. */
const fakeRepo = (over: Partial<CourseDetailRepository>): CourseDetailRepository =>
  ({
    findAdvisingBySectionId: async () => [],
    isAdvisingParticipant: async () => true,
    insertRsvp: async () => {},
    deleteRsvp: async () => {},
    countRsvp: async () => 0,
    ...over,
  }) as unknown as CourseDetailRepository;

const buildRow = (over: Partial<RawAdvisingRow> = {}): RawAdvisingRow => ({
  id: 1,
  course_offering_id: 10,
  section_id: 1,
  day_of_week: 1,
  start_time: "10:00",
  end_time: "11:00",
  classroom: "A-101",
  meeting_url: "https://zoom.us/x",
  teacher_code: "hquintan",
  full_name: "Quintana Cruz, Hernan",
  kind: "recurring",
  session_date: null,
  dictante_rol: "Profesor",
  asistentes: 3,
  my_rsvp: false,
  ...over,
});

/** Contexto Hono mínimo para probar el controller sin levantar el server. */
const fakeCtx = (params: Record<string, string>, vars: Record<string, unknown>): Context =>
  ({
    req: { param: () => params },
    get: (k: string) => vars[k],
    json: (body: unknown) => body,
  }) as unknown as Context;

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

// ─── Service: confirmRsvp / cancelRsvp (caja blanca) ─────────────────────────

describe("CourseDetailService.confirmRsvp", () => {
  test("alumno participante ⇒ inserta y devuelve conteo + myRsvp=true", async () => {
    let inserted = 0;
    const service = new CourseDetailService(
      fakeRepo({
        isAdvisingParticipant: async () => true,
        insertRsvp: async () => {
          inserted++;
        },
        countRsvp: async () => 4,
      }),
      noopEvents,
    );

    const res = await service.confirmRsvp(5, 6);

    expect(inserted).toBe(1);
    expect(res).toEqual({ id: "5", asistentes: 4, myRsvp: true });
  });

  test("alumno NO participante ⇒ 404 y NO inserta", async () => {
    let inserted = 0;
    const service = new CourseDetailService(
      fakeRepo({
        isAdvisingParticipant: async () => false,
        insertRsvp: async () => {
          inserted++;
        },
      }),
      noopEvents,
    );

    await expectHttpError(() => service.confirmRsvp(999, 6), 404, "ADVISING_SESSION_NOT_FOUND");
    expect(inserted).toBe(0);
  });

  test("confirmar dos veces ⇒ conteo estable (idempotente, sin duplicar)", async () => {
    // El unique en BD hace el ON CONFLICT no-op; el conteo no crece.
    const service = new CourseDetailService(
      fakeRepo({ isAdvisingParticipant: async () => true, countRsvp: async () => 1 }),
      noopEvents,
    );

    const a = await service.confirmRsvp(5, 6);
    const b = await service.confirmRsvp(5, 6);
    expect(a.asistentes).toBe(1);
    expect(b.asistentes).toBe(1);
    expect(b.myRsvp).toBe(true);
  });
});

describe("CourseDetailService.cancelRsvp", () => {
  test("cancela ⇒ borra y devuelve conteo + myRsvp=false", async () => {
    let deleted = 0;
    const service = new CourseDetailService(
      fakeRepo({
        deleteRsvp: async () => {
          deleted++;
        },
        countRsvp: async () => 2,
      }),
      noopEvents,
    );

    const res = await service.cancelRsvp(5, 6);
    expect(deleted).toBe(1);
    expect(res).toEqual({ id: "5", asistentes: 2, myRsvp: false });
  });

  test("cancelar sin confirmación previa ⇒ no-op, myRsvp=false", async () => {
    const service = new CourseDetailService(
      fakeRepo({ countRsvp: async () => 0 }),
      noopEvents,
    );
    const res = await service.cancelRsvp(5, 6);
    expect(res.asistentes).toBe(0);
    expect(res.myRsvp).toBe(false);
  });
});

// ─── Service: getAdvising mapea myRsvp y defaults ────────────────────────────

describe("CourseDetailService.getAdvising — mapeo de myRsvp", () => {
  test("propaga studentId al repositorio y mapea my_rsvp=true ⇒ myRsvp=true", async () => {
    let seenStudentId: number | undefined = -1;
    const service = new CourseDetailService(
      fakeRepo({
        findAdvisingBySectionId: async (_sectionId: number, studentId?: number) => {
          seenStudentId = studentId;
          return [buildRow({ my_rsvp: true, asistentes: 5 })];
        },
      }),
      noopEvents,
    );

    const { asesorias } = await service.getAdvising(1, 6);
    expect(seenStudentId).toBe(6);
    expect(asesorias[0].myRsvp).toBe(true);
    expect(asesorias[0].asistentes).toBe(5);
  });

  test("my_rsvp null/false ⇒ myRsvp=false y defaults de campos HU18", async () => {
    const service = new CourseDetailService(
      fakeRepo({
        findAdvisingBySectionId: async () => [
          buildRow({ my_rsvp: null, kind: null, dictante_rol: null, asistentes: null }),
        ],
      }),
      noopEvents,
    );

    const { asesorias } = await service.getAdvising(1);
    expect(asesorias[0].myRsvp).toBe(false);
    expect(asesorias[0].kind).toBe("recurring");
    expect(asesorias[0].dictanteRol).toBe("Profesor");
    expect(asesorias[0].asistentes).toBe(0);
  });
});

// ─── Controller: guard de rol (solo alumnos) ─────────────────────────────────

describe("CourseDetailController — RSVP solo alumnos", () => {
  const service = new CourseDetailService(
    fakeRepo({ isAdvisingParticipant: async () => true, countRsvp: async () => 1 }),
    noopEvents,
  );
  const controller = new CourseDetailController(service);

  test("token de alumno (studentId presente) ⇒ confirma y responde", async () => {
    const c = fakeCtx({ sessionId: "5" }, { studentId: 6 });
    const res = (await controller.confirmRsvp(c)) as { id: string; myRsvp: boolean };
    expect(res.id).toBe("5");
    expect(res.myRsvp).toBe(true);
  });

  test("token docente (sin studentId) ⇒ 403 ADVISING_RSVP_STUDENT_ONLY", async () => {
    const c = fakeCtx({ sessionId: "5" }, { teacherId: 129 });
    await expectHttpError(() => controller.confirmRsvp(c), 403, "ADVISING_RSVP_STUDENT_ONLY");
  });

  test("cancelar como docente ⇒ 403 igual que confirmar", async () => {
    const c = fakeCtx({ sessionId: "5" }, {});
    await expectHttpError(() => controller.cancelRsvp(c), 403, "ADVISING_RSVP_STUDENT_ONLY");
  });
});
