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
 *   sectionId, docente, jefePractica, alumnos[], user, roleInSection, career_id,
 *   networking.
 *
 * CLASES:
 *   CV1 docente + alumnos representativos.
 *   CV2 docente ausente y alumnos vacios.
 *   CNV1 sectionId invalido rechazado en DTO de ruta.
 */

const noopEvents = {} as unknown as EventBus;

const repo = (teacherRows: unknown[], jpRows: unknown[], students: unknown[]) =>
  ({
    findSections: async () => [],
    findTeachers: async () => [],
    findEnrollments: async () => [],
    findAnnouncementsBySectionId: async () => [],
    findContactTeacherRowsBySectionId: async () => teacherRows,
    findContactJpRowsBySectionId: async () => jpRows,
    findContactStudentRowsBySectionId: async () => students,
  }) as unknown as CourseDetailRepository;

describe("CAJA NEGRA · HU14 contactos de seccion", () => {
  test("CV1: devuelve docente y alumnos con campos esperados", async () => {
    const service = new CourseDetailService(
      repo(
        [
          {
            teacher_code: "P001",
            full_name: "Quispe, Rosa",
            networking_opt_in: true,
            platform: "linkedin",
            url: "https://linkedin.com/in/rosa",
            label: null,
          },
        ],
        [],
        [
          {
            enrollment_id: 1,
            code: "20230001",
            full_name: "Torres, Ana",
            institutional_email: "20230001@aloe.ulima.edu.pe",
            networking_opt_in: false,
            career_id: 1,
            position: "delegate",
            platform: null,
            url: null,
            label: null,
          },
        ],
      ),
      noopEvents,
    );

    const result = await service.getContacts(10);

    expect(result.docente).toEqual({
      code: "P001",
      firstName: "Rosa",
      lastName: "Quispe",
      networking: {
        optIn: true,
        links: [{ platform: "linkedin", url: "https://linkedin.com/in/rosa", label: null }],
      },
    });
    expect(result.alumnos[0].user.code).toBe("20230001");
    expect(result.alumnos[0].roleInSection).toBe("delegado");
    expect(result.alumnos[0].user.career_id).toBe(1);
    expect(result.alumnos[0].networking).toEqual({ optIn: false, links: [] });
  });

  test("CV2: seccion sin docente ni alumnos retorna estructura estable", async () => {
    const service = new CourseDetailService(repo([], [], []), noopEvents);
    await expect(service.getContacts(10)).resolves.toEqual({
      docente: null,
      jefePractica: null,
      alumnos: [],
    });
  });

  test("CNV1: sectionId acepta solo entero positivo", () => {
    expect(sectionIdParamSchema.safeParse({ sectionId: "10" }).success).toBe(true);
    expect(sectionIdParamSchema.safeParse({ sectionId: "-1" }).success).toBe(false);
    expect(sectionIdParamSchema.safeParse({ sectionId: "abc" }).success).toBe(false);
  });
});
