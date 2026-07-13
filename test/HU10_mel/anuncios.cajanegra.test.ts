import { describe, expect, test } from "bun:test";
import {
  announcementIdParamSchema,
  createAnnouncementSchema,
  sectionIdParamSchema,
  updateAnnouncementSchema,
} from "../../src/modules/section-management/section-management.schemas.js";

/**
 * ============================================================================
 * CAJA NEGRA - HU10 Registrar anuncios academicos
 * Fuente: section-management.schemas.ts
 * ============================================================================
 * Se derivan los casos desde el contrato del formulario/API, no desde la
 * implementacion interna del servicio. El payload de registrar/editar anuncio
 * tiene mas de 4 entradas cuando se considera ruta + body:
 *   sectionId, announcementId, title, message, campos extra.
 *
 * PARTICION DE EQUIVALENCIA + VALORES LIMITE:
 * | Campo    | Clase valida              | Clase invalida / limite             |
 * |----------|---------------------------|-------------------------------------|
 * | sectionId| entero positivo/coercible | 0, negativo, texto                  |
 * | id       | entero positivo/coercible | 0, texto                            |
 * | title    | 1..150 chars tras trim    | "", espacios, >150                 |
 * | message  | 1..5000 chars tras trim   | "", espacios, >5000                |
 */

describe("CAJA NEGRA · HU10 create/update announcement payload", () => {
  test("CV1: payload valido con espacios se normaliza por trim", () => {
    const parsed = createAnnouncementSchema.safeParse({
      title: "  Parcial 2  ",
      message: "  El examen sera en la semana 10.  ",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("Parcial 2");
      expect(parsed.data.message).toBe("El examen sera en la semana 10.");
    }
  });

  test("CNV1: titulo vacio o solo espacios es rechazado", () => {
    expect(createAnnouncementSchema.safeParse({ title: "", message: "ok" }).success).toBe(false);
    expect(createAnnouncementSchema.safeParse({ title: "   ", message: "ok" }).success).toBe(false);
  });

  test("CNV2: mensaje vacio o solo espacios es rechazado", () => {
    expect(createAnnouncementSchema.safeParse({ title: "Titulo", message: "" }).success).toBe(false);
    expect(createAnnouncementSchema.safeParse({ title: "Titulo", message: "   " }).success).toBe(false);
  });

  test("CNV3: limites superiores de titulo y mensaje se aplican", () => {
    expect(createAnnouncementSchema.safeParse({ title: "x".repeat(150), message: "m" }).success).toBe(true);
    expect(createAnnouncementSchema.safeParse({ title: "x".repeat(151), message: "m" }).success).toBe(false);
    expect(createAnnouncementSchema.safeParse({ title: "T", message: "m".repeat(5000) }).success).toBe(true);
    expect(createAnnouncementSchema.safeParse({ title: "T", message: "m".repeat(5001) }).success).toBe(false);
  });

  test("CNV4: update usa el mismo contrato que create", () => {
    expect(updateAnnouncementSchema.safeParse({ title: "Cambio", message: "Detalle" }).success).toBe(true);
    expect(updateAnnouncementSchema.safeParse({ title: "", message: "Detalle" }).success).toBe(false);
  });

  test("CNV5: parametros de ruta aceptan solo enteros positivos", () => {
    expect(sectionIdParamSchema.safeParse({ sectionId: "15" }).success).toBe(true);
    expect(sectionIdParamSchema.safeParse({ sectionId: "0" }).success).toBe(false);
    expect(announcementIdParamSchema.safeParse({ id: "99" }).success).toBe(true);
    expect(announcementIdParamSchema.safeParse({ id: "abc" }).success).toBe(false);
  });
});
