import { describe, expect, test } from "bun:test";
import type { EventBus } from "../../src/events/index.js";
import type { CourseDetailRepository } from "../../src/modules/course-detail/course-detail.repository.js";
import { CourseDetailService } from "../../src/modules/course-detail/course-detail.service.js";
import type { RawContactStudentRow } from "../../src/modules/course-detail/course-detail.types.js";

/**
 * ============================================================================
 * PRUEBAS UNITARIAS - HU14 Visualizar contactos de la seccion
 * ============================================================================
 * Casos pequenos sobre mapeo de estudiantes, nombres y campos de usuario.
 */

const noopEvents = {} as unknown as EventBus;

const student = (over: Partial<RawContactStudentRow> = {}): RawContactStudentRow => ({
  enrollment_id: 1,
  code: "20230001",
  full_name: "Ramos Silva Marco",
  institutional_email: "20230001@aloe.ulima.edu.pe",
  career_id: 2,
  position: null,
  ...over,
});

const serviceWith = (students: RawContactStudentRow[]) =>
  new CourseDetailService(
    {
      findAnnouncementsBySectionId: async () => [],
      findContactTeacherBySectionId: async () => null,
      findContactStudentsBySectionId: async () => students,
    } as unknown as CourseDetailRepository,
    noopEvents,
  );

describe("UNITARIA · HU14 contactos", () => {
  test("caso 1: estudiante conserva codigo y correo institucional", async () => {
    const result = await serviceWith([student()]).getContacts(1);
    expect(result.alumnos[0].user.code).toBe("20230001");
    expect(result.alumnos[0].user.email).toBe("20230001@aloe.ulima.edu.pe");
  });

  test("caso 2: career_id null se conserva como null", async () => {
    const result = await serviceWith([student({ career_id: null })]).getContacts(1);
    expect(result.alumnos[0].user.career_id).toBeNull();
  });

  test("caso 3: full_name con dos apellidos separa correctamente", async () => {
    const result = await serviceWith([student({ full_name: "Ramos Silva Marco" })]).getContacts(1);
    expect(result.alumnos[0].user.lastName).toBe("Ramos Silva");
    expect(result.alumnos[0].user.firstName).toBe("Marco");
  });

  test("caso 4: full_name de una palabra no inventa apellido", async () => {
    const result = await serviceWith([student({ full_name: "Ulises" })]).getContacts(1);
    expect(result.alumnos[0].user.firstName).toBe("Ulises");
    expect(result.alumnos[0].user.lastName).toBe("");
  });
});
