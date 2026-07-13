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
 * PRUEBAS UNITARIAS - HU10 Gestion de anuncios academicos
 * ============================================================================
 * Casos aislados sobre reglas pequenas del servicio: mapeo de autor,
 * normalizacion de fecha, ownership y listado de gestion por representante.
 */

const noopEvents = {} as unknown as EventBus;

const representative: RepresentativeAccess = {
  id: 17,
  sectionId: 3,
  studentId: 42,
  position: "delegate",
};

const row = (over: Partial<AnnouncementRow> = {}): AnnouncementRow => ({
  id: 10,
  section_id: 3,
  section_representative_id: 17,
  title: "Entrega",
  message: "Subir informe",
  published_at: new Date("2026-07-13T10:00:00.000Z"),
  autor_code: "20232637",
  full_name: "Ruiz, Mel",
  institutional_email: "20232637@aloe.ulima.edu.pe",
  position: "delegate",
  ...over,
});

const ownership = (over: Partial<AnnouncementOwnership> = {}): AnnouncementOwnership => ({
  id: 10,
  sectionRepresentativeId: 17,
  sectionId: 3,
  studentId: 42,
  isActive: true,
  ...over,
});

const makeRepo = (overrides: Partial<SectionManagementRepository> = {}) =>
  ({
    findRepresentativeAccess: async () => representative,
    findAnnouncementsByRepresentative: async () => [row()],
    createAnnouncement: async () => 10,
    findAnnouncementById: async () => row(),
    findAnnouncementOwnership: async () => ownership(),
    updateAnnouncement: async () => undefined,
    softDeleteAnnouncement: async () => undefined,
    ...overrides,
  }) as unknown as SectionManagementRepository;

describe("UNITARIA · HU10 SectionManagementService", () => {
  test("caso 1: el historial de gestion consulta por representante autenticado, no por seccion global", async () => {
    let requestedRepresentativeId = 0;
    const service = new SectionManagementService(
      makeRepo({
        findAnnouncementsByRepresentative: async (id) => {
          requestedRepresentativeId = id;
          return [row({ section_representative_id: id })];
        },
      }),
      noopEvents,
    );

    const result = await service.getAnnouncements(42, 3);

    expect(requestedRepresentativeId).toBe(17);
    expect(result.anuncios).toHaveLength(1);
  });

  test("caso 2: mapAnnouncement separa apellido/nombre cuando full_name viene con coma", async () => {
    const service = new SectionManagementService(makeRepo(), noopEvents);

    const result = await service.getAnnouncements(42, 3);

    expect(result.anuncios[0].autor.lastName).toBe("Ruiz");
    expect(result.anuncios[0].autor.firstName).toBe("Mel");
  });

  test("caso 3: published_at Date se serializa como ISO string", async () => {
    const service = new SectionManagementService(makeRepo(), noopEvents);

    const result = await service.getAnnouncements(42, 3);

    expect(result.anuncios[0].fecha).toBe("2026-07-13T10:00:00.000Z");
  });

  test("caso 4: subdelegado se expone como rol subdelegado en el autor", async () => {
    const service = new SectionManagementService(
      makeRepo({
        findAnnouncementsByRepresentative: async () => [row({ position: "subdelegate" })],
      }),
      noopEvents,
    );

    const result = await service.getAnnouncements(42, 3);

    expect(result.anuncios[0].autor.role).toBe("subdelegado");
  });
});
