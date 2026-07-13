/*
  bun test test/HU10_mel/anuncios.cajablanca.test.ts
*/

import { describe, expect, test } from "bun:test";
import type { EventBus } from "../../src/events/index.js";
import type { SectionManagementRepository } from "../../src/modules/section-management/section-management.repository.js";
import { SectionManagementService } from "../../src/modules/section-management/section-management.service.js";
import type {
  AnnouncementOwnership,
  AnnouncementRow,
  RepresentativeAccess,
} from "../../src/modules/section-management/section-management.types.js";

/**
 * ============================================================================
 * CAJA BLANCA - Gestion de anuncios academicos (HU10)
 * Fuente: src/modules/section-management/section-management.service.ts
 * ============================================================================
 * Objetivo:
 *   Verificar los caminos internos de SectionManagementService al crear,
 *   editar y eliminar anuncios desde el modulo de gestion de seccion.
 *
 * Criterio de aceptacion relacionado:
 *   El delegado puede publicar anuncios para su seccion, pero solo puede
 *   gestionar anuncios creados por su propia representacion. Esto evita que un
 *   delegado vea/edite/elimine anuncios de otro alumno delegado.
 *
 * Justificacion de caja blanca:
 *   Se conocen los metodos internos y sus decisiones principales. Por eso se
 *   cubre un camino por predicado relevante, aislando la BD con un repositorio
 *   falso y observando que errores o acciones ejecuta el servicio.
 *
 * NODOS/PREDICADOS principales:
 *   P1 requireRepresentative(): existe/no existe representante para la seccion.
 *   P2 createAnnouncement(): se recupera/no se recupera el anuncio creado.
 *   P3 requireAnnouncementOwner(): el anuncio existe y esta activo/no existe.
 *   P4 requireAnnouncementOwner(): el anuncio pertenece/no pertenece al alumno.
 *   P5 deleteAnnouncement(): invoca softDeleteAnnouncement sobre el id correcto.
 *
 * TABLA DE CAMINOS INDEPENDIENTES:
 * | #  | Camino probado                                      | Entrada que lo fuerza                  | Esperado                    |
 * |----|-----------------------------------------------------|----------------------------------------|-----------------------------|
 * | C1 | P1(V) -> crear anuncio -> P2(V)                     | delegado valido en la seccion          | anuncio creado con rep. 7   |
 * | C2 | P1(F)                                               | alumno sin representacion              | 403 SECTION_FORBIDDEN       |
 * | C3 | P1(V) -> crear anuncio -> P2(F)                     | repo no devuelve anuncio creado        | 500 ANNOUNCEMENT_CREATE_FAILED |
 * | C4 | P3(V) -> P4(F)                                      | anuncio pertenece a otro studentId     | 403 ANNOUNCEMENT_FORBIDDEN  |
 * | C5 | P3(V) -> P4(V) -> soft delete                       | anuncio propio                         | elimina exactamente id 50   |
 *
 * Alcance:
 *   No prueba HTTP ni BD real. La prueba se concentra en reglas de negocio,
 *   autorizacion y caminos internos del servicio.
 */

const noopEvents = {} as unknown as EventBus;

const representative: RepresentativeAccess = {
  id: 7,
  sectionId: 20,
  studentId: 100,
  position: "delegate",
};

const row = (over: Partial<AnnouncementRow> = {}): AnnouncementRow => ({
  id: 50,
  section_id: 20,
  section_representative_id: 7,
  title: "Parcial",
  message: "Repasar capitulos 1 y 2",
  published_at: "2026-07-13T00:00:00.000Z",
  autor_code: "20230001",
  full_name: "Torres, Ana",
  institutional_email: "20230001@aloe.ulima.edu.pe",
  position: "delegate",
  ...over,
});

const ownership = (over: Partial<AnnouncementOwnership> = {}): AnnouncementOwnership => ({
  id: 50,
  sectionRepresentativeId: 7,
  sectionId: 20,
  studentId: 100,
  isActive: true,
  ...over,
});

const makeRepo = (overrides: Partial<SectionManagementRepository> = {}) =>
  ({
    findRepresentativeAccess: async () => representative,
    findAnnouncementsByRepresentative: async () => [row()],
    createAnnouncement: async () => 50,
    findAnnouncementById: async () => row(),
    findAnnouncementOwnership: async () => ownership(),
    updateAnnouncement: async () => undefined,
    softDeleteAnnouncement: async () => undefined,
    ...overrides,
  }) as unknown as SectionManagementRepository;

const expectHttpError = async (action: Promise<unknown>, statusCode: number, code: string) => {
  try {
    await action;
    throw new Error(`Se esperaba ${statusCode} ${code}`);
  } catch (error) {
    const httpError = error as { statusCode?: number; code?: string };
    expect(httpError.statusCode).toBe(statusCode);
    expect(httpError.code).toBe(code);
  }
};

describe("CAJA BLANCA · HU10 SectionManagementService", () => {
  test("C1: delegado valido crea anuncio con el sectionRepresentativeId autenticado", async () => {
    let capturedRepresentativeId = 0;
    const service = new SectionManagementService(
      makeRepo({
        createAnnouncement: async (input) => {
          capturedRepresentativeId = input.sectionRepresentativeId;
          return 50;
        },
      }),
      noopEvents,
    );

    const result = await service.createAnnouncement(100, 20, {
      title: "Parcial",
      message: "Repasar capitulos 1 y 2",
    });

    expect(capturedRepresentativeId).toBe(7);
    expect(result.anuncio.id).toBe("50");
  });

  test("C2: alumno sin representacion no puede crear anuncios en la seccion", async () => {
    const service = new SectionManagementService(
      makeRepo({ findRepresentativeAccess: async () => null }),
      noopEvents,
    );

    await expectHttpError(
      service.createAnnouncement(999, 20, { title: "T", message: "M" }),
      403,
      "SECTION_FORBIDDEN",
    );
  });

  test("C3: si el anuncio creado no se recupera, retorna ANNOUNCEMENT_CREATE_FAILED", async () => {
    const service = new SectionManagementService(
      makeRepo({ findAnnouncementById: async () => null }),
      noopEvents,
    );

    await expectHttpError(
      service.createAnnouncement(100, 20, { title: "T", message: "M" }),
      500,
      "ANNOUNCEMENT_CREATE_FAILED",
    );
  });

  test("C4: editar anuncio de otro alumno esta prohibido", async () => {
    const service = new SectionManagementService(
      makeRepo({ findAnnouncementOwnership: async () => ownership({ studentId: 200 }) }),
      noopEvents,
    );

    await expectHttpError(
      service.updateAnnouncement(100, 50, { title: "Nuevo", message: "Texto" }),
      403,
      "ANNOUNCEMENT_FORBIDDEN",
    );
  });

  test("C5: borrar anuncio propio invoca soft delete exactamente sobre ese id", async () => {
    const deletedIds: number[] = [];
    const service = new SectionManagementService(
      makeRepo({ softDeleteAnnouncement: async (id) => void deletedIds.push(id) }),
      noopEvents,
    );

    const result = await service.deleteAnnouncement(100, 50);

    expect(deletedIds).toEqual([50]);
    expect(result.message).toContain("eliminado");
  });
});
