import { describe, expect, test } from "bun:test";
import type { EventBus } from "../../src/events/index.js";
import type { CourseDetailRepository } from "../../src/modules/course-detail/course-detail.repository.js";
import { sectionIdParamSchema } from "../../src/modules/course-detail/course-detail.schemas.js";
import { CourseDetailService } from "../../src/modules/course-detail/course-detail.service.js";

/**
 * ============================================================================
 * CAJA NEGRA - HU14 Visualizar contactos de la seccion
 * Fuente: GET /course-detail/sections/:sectionId/contacts
 * ============================================================================
 * Contrato observado por frontend:
 *   sectionId, docente, alumnos[], user, roleInSection, career_id.
 *
 * CLASES:
 *   CV1 docente + alumnos representativos.
 *   CV2 docente ausente y alumnos vacios.
 *   CNV1 sectionId invalido rechazado en DTO de ruta.
 */

const noopEvents = {} as unknown as EventBus;

const repo = (teacher: unknown, students: unknown[]) =>
  ({
    findAnnouncementsBySectionId: async () => [],
    findContactTeacherBySectionId: async () => teacher,
    findContactStudentsBySectionId: async () => students,
  }) as unknown as CourseDetailRepository;

describe("CAJA NEGRA · HU14 contactos de seccion", () => {
  test("CV1: devuelve docente y alumnos con campos esperados", async () => {
    const service = new CourseDetailService(
      repo(
        { teacher_code: "P001", full_name: "Quispe, Rosa" },
        [
          {
            enrollment_id: 1,
            code: "20230001",
            full_name: "Torres, Ana",
            institutional_email: "20230001@aloe.ulima.edu.pe",
            career_id: 1,
            position: "delegate",
          },
        ],
      ),
      noopEvents,
    );

    const result = await service.getContacts(10);

    expect(result.docente).toEqual({ code: "P001", firstName: "Rosa", lastName: "Quispe" });
    expect(result.alumnos[0].user.code).toBe("20230001");
    expect(result.alumnos[0].roleInSection).toBe("delegado");
    expect(result.alumnos[0].user.career_id).toBe(1);
  });

  test("CV2: seccion sin docente ni alumnos retorna estructura estable", async () => {
    const service = new CourseDetailService(repo(null, []), noopEvents);
    await expect(service.getContacts(10)).resolves.toEqual({ docente: null, alumnos: [] });
  });

  test("CNV1: sectionId acepta solo entero positivo", () => {
    expect(sectionIdParamSchema.safeParse({ sectionId: "10" }).success).toBe(true);
    expect(sectionIdParamSchema.safeParse({ sectionId: "-1" }).success).toBe(false);
    expect(sectionIdParamSchema.safeParse({ sectionId: "abc" }).success).toBe(false);
  });
});
