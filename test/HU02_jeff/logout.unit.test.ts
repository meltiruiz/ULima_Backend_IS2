import { describe, expect, test } from "bun:test";
import { EventBus } from "../../src/events/index.js";
import type { AuthRepository } from "../../src/modules/auth/auth.repository.js";
import { AuthRepository as AuthRepositoryClass } from "../../src/modules/auth/auth.repository.js";
import { AuthService } from "../../src/modules/auth/auth.service.js";

/**
 * ============================================================================
 * PRUEBA UNITARIA — Cierre de sesión / invalidación de token (HU02)
 * ============================================================================
 * "Single Active Session": cerrar sesión (o iniciar una nueva) INCREMENTA
 * `app_user.token_version`; el `authMiddleware` rechaza cualquier JWT cuya
 * versión ya no coincida con la de BD. Aquí se prueban de forma aislada:
 *   1. AuthService.logout()        — src/modules/auth/auth.service.ts:234
 *   2. AuthRepository.incrementTokenVersion() — auth.repository.ts:89 (mapeo)
 * con dependencias falsas (repo / db), sin tocar la base real.
 * ≥4 casos que validan su correcto funcionamiento.
 */

// --- Fakes -------------------------------------------------------------------
const fakeRepo = (opts: { throwOnIncrement?: boolean } = {}) => {
  const calls = { incrementedUserIds: [] as number[] };
  const repository = {
    incrementTokenVersion: async (userId: number) => {
      calls.incrementedUserIds.push(userId);
      if (opts.throwOnIncrement) throw new Error("fallo de BD");
      return 1;
    },
  } as unknown as AuthRepository;
  return { repository, calls };
};

/** Construye un AuthRepository real con un `database.execute` controlado. */
const repoWithDbRows = (rows: unknown) =>
  new AuthRepositoryClass(
    { execute: async () => rows } as unknown as ConstructorParameters<typeof AuthRepositoryClass>[0],
  );

// --- Tests -------------------------------------------------------------------
describe("UNITARIA · logout / invalidación de token (HU02)", () => {
  test("caso 1: logout(userId) invalida la sesión llamando incrementTokenVersion 1 vez con el id correcto", async () => {
    const { repository, calls } = fakeRepo();
    const service = new AuthService(repository, new EventBus());

    await service.logout(42);

    expect(calls.incrementedUserIds).toEqual([42]); // exactamente una vez, con 42
  });

  test("caso 2: logout de otro usuario usa su propio id (no cruza sesiones)", async () => {
    const { repository, calls } = fakeRepo();
    const service = new AuthService(repository, new EventBus());

    await service.logout(7);

    expect(calls.incrementedUserIds).toEqual([7]);
  });

  test("caso 3: si la BD falla, logout NO propaga la excepción (traga el error, resuelve void)", async () => {
    const { repository, calls } = fakeRepo({ throwOnIncrement: true });
    const service = new AuthService(repository, new EventBus());

    // No debe lanzar: el endpoint /logout responde 200 igual (best-effort).
    await expect(service.logout(42)).resolves.toBeUndefined();
    expect(calls.incrementedUserIds).toEqual([42]); // sí intentó incrementar
  });

  test("caso 4: incrementTokenVersion devuelve la NUEVA versión como número (no string)", async () => {
    const repo = repoWithDbRows([{ token_version: 8 }]);

    const version = await repo.incrementTokenVersion(42);

    expect(version).toBe(8);
    expect(typeof version).toBe("number");
  });

  test("caso 5: incrementTokenVersion con fila vacía → default 1 sin lanzar (valor límite)", async () => {
    const repo = repoWithDbRows([]);

    await expect(repo.incrementTokenVersion(42)).resolves.toBe(1);
  });

  test("caso 6: incrementTokenVersion normaliza token_version tipo string de Postgres → number", async () => {
    const repo = repoWithDbRows([{ token_version: "9" }]);

    const version = await repo.incrementTokenVersion(42);

    expect(version).toBe(9);
    expect(typeof version).toBe("number");
  });
});
