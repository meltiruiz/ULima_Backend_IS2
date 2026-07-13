import { describe, expect, test } from "bun:test";
import type { EventBus } from "../../src/events/index.js";
import type { CourseDetailRepository } from "../../src/modules/course-detail/course-detail.repository.js";
import { CourseDetailService } from "../../src/modules/course-detail/course-detail.service.js";
import type {
  RawContactStudentRow,
  RawContactTeacherRow,
} from "../../src/modules/course-detail/course-detail.types.js";

/**
 * ============================================================================
 * CAJA BLANCA - HU14 CourseDetailService.getContacts()
 * ============================================================================
 * Caminos internos:
 *   C1 teacher null -> docente null
 *   C2 teacher existe -> mapTeacher()
 *   C3 position delegate -> delegado
 *   C4 position subdelegate -> subdelegado
 *   C5 position null/otro -> estudiante
 *   C6 splitName() con coma, dos palabras y una palabra.
 */

const noopEvents = {} as unknown as EventBus;

const student = (over: Partial<RawContactStudentRow> = {}): RawContactStudentRow => ({
  enrollment_id: 1,
  code: "20230001",
  full_name: "Torres, Ana",
  institutional_email: "20230001@aloe.ulima.edu.pe",
  career_id: 1,
  position: "delegate",
  ...over,
});

const serviceWith = (
  teacher: RawContactTeacherRow | null,
  students: RawContactStudentRow[],
) =>
  new CourseDetailService(
    {
      findAnnouncementsBySectionId: async () => [],
      findContactTeacherBySectionId: async () => teacher,
      findContactStudentsBySectionId: async () => students,
    } as unknown as CourseDetailRepository,
    noopEvents,
  );

describe("CAJA BLANCA · HU14 getContacts()", () => {
  test("C1: teacher null retorna docente null", async () => {
    const result = await serviceWith(null, []).getContacts(1);
    expect(result.docente).toBeNull();
  });

  test("C2: teacher existente se mapea con codigo y nombres", async () => {
    const result = await serviceWith({ teacher_code: "P002", full_name: "Diaz Elena" }, []).getContacts(1);
    expect(result.docente).toEqual({ code: "P002", firstName: "Elena", lastName: "Diaz" });
  });

  test("C3: delegate se normaliza a delegado", async () => {
    const result = await serviceWith(null, [student({ position: "delegate" })]).getContacts(1);
    expect(result.alumnos[0].roleInSection).toBe("delegado");
  });

  test("C4: subdelegate se normaliza a subdelegado", async () => {
    const result = await serviceWith(null, [student({ position: "subdelegate" })]).getContacts(1);
    expect(result.alumnos[0].roleInSection).toBe("subdelegado");
  });

  test("C5: position null cae a estudiante", async () => {
    const result = await serviceWith(null, [student({ position: null })]).getContacts(1);
    expect(result.alumnos[0].roleInSection).toBe("estudiante");
  });
});
