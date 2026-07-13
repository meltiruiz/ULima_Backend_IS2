import { describe, expect, test } from "bun:test";
import type { EventBus } from "../../src/events/index.js";
import { NetworkingService } from "../../src/modules/networking/networking.service.js";
import type { NetworkingRepository } from "../../src/modules/networking/networking.repository.js";
import type { NetworkingCard, PublicNetworkingCard, SocialLink } from "../../src/modules/networking/networking.types.js";

/**
 * ============================================================================
 * CAJA BLANCA - HU25 NetworkingService
 * Fuente: networking.service.ts
 * ============================================================================
 * Caminos independientes:
 *   C1 getMine usuario inexistente -> USER_NOT_FOUND
 *   C2 getMine con mas de una red -> NETWORKING_DATA_INTEGRITY
 *   C3 updateMine con mas de una red -> INVALID_NETWORKING_LINK_COUNT
 *   C4 updateMine con link invalido -> INVALID_NETWORKING_LINK
 *   C5 updateMine valido normaliza y persiste
 *   C6 getVisibleByUserId oculto -> NETWORKING_CARD_HIDDEN
 */

const noopEvents = {} as unknown as EventBus;

const card = (over: Partial<NetworkingCard> = {}): NetworkingCard => ({
  optIn: true,
  links: [],
  ...over,
});

const publicCard = (over: Partial<PublicNetworkingCard> = {}): PublicNetworkingCard => ({
  optIn: true,
  links: [],
  owner: {
    userId: 1,
    fullName: "Ana Torres",
    primaryDetail: "Ingenieria",
    secondaryDetail: "20230001 - Alumno",
    roleLabel: "Alumno",
  },
  ...over,
});

const makeRepo = (overrides: Partial<NetworkingRepository> = {}) =>
  ({
    findByUserId: async () => card(),
    replaceByUserId: async (_userId: number, optIn: boolean, link: SocialLink | null) =>
      card({ optIn, links: link ? [link] : [] }),
    findPublicByUserId: async () => publicCard(),
    ...overrides,
  }) as unknown as NetworkingRepository;

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

describe("CAJA BLANCA · HU25 NetworkingService", () => {
  test("C1: getMine usuario inexistente -> USER_NOT_FOUND", async () => {
    const service = new NetworkingService(makeRepo({ findByUserId: async () => null }), noopEvents);
    await expectHttpError(service.getMine(99), 404, "USER_NOT_FOUND");
  });

  test("C2: getMine detecta integridad rota con mas de una red", async () => {
    const service = new NetworkingService(
      makeRepo({
        findByUserId: async () => card({
          links: [
            { platform: "github", url: "https://github.com/a", label: null },
            { platform: "instagram", url: "https://instagram.com/a", label: null },
          ],
        }),
      }),
      noopEvents,
    );
    await expectHttpError(service.getMine(1), 500, "NETWORKING_DATA_INTEGRITY");
  });

  test("C3: updateMine rechaza mas de una red antes de persistir", async () => {
    const service = new NetworkingService(makeRepo(), noopEvents);
    await expectHttpError(
      service.updateMine(1, {
        optIn: true,
        links: [
          { platform: "github", url: "https://github.com/a" },
          { platform: "instagram", url: "https://instagram.com/a" },
        ],
      }),
      400,
      "INVALID_NETWORKING_LINK_COUNT",
    );
  });

  test("C4: updateMine rechaza link invalido", async () => {
    const service = new NetworkingService(makeRepo(), noopEvents);
    await expectHttpError(
      service.updateMine(1, {
        optIn: true,
        links: [{ platform: "linkedin", url: "https://example.com/a" }],
      }),
      400,
      "INVALID_NETWORKING_LINK",
    );
  });

  test("C5: updateMine valido recorta url y label antes de persistir", async () => {
    let saved: SocialLink | null = null;
    const service = new NetworkingService(
      makeRepo({
        replaceByUserId: async (_userId, optIn, link) => {
          saved = link;
          return card({ optIn, links: link ? [link] : [] });
        },
      }),
      noopEvents,
    );

    await service.updateMine(1, {
      optIn: true,
      links: [{ platform: "website", url: "  https://mel.dev  ", label: "  Web  " }],
    });

    expect(saved).toEqual({ platform: "website", url: "https://mel.dev", label: "Web" });
  });

  test("C6: getVisibleByUserId de carnet oculto -> NETWORKING_CARD_HIDDEN", async () => {
    const service = new NetworkingService(
      makeRepo({ findPublicByUserId: async () => publicCard({ optIn: false }) }),
      noopEvents,
    );
    await expectHttpError(service.getVisibleByUserId(1), 403, "NETWORKING_CARD_HIDDEN");
  });
});
