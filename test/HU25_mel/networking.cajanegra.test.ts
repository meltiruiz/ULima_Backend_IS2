/*
  bun test/HU25_mel/networking.cajanegra.test.ts
*/
import { describe, expect, test } from "bun:test";
import {
  socialLinkSchema,
  updateNetworkingSchema,
} from "../../src/modules/networking/networking.schemas.js";

/**
 * ============================================================================
 * CAJA NEGRA - Carnet de networking opt-in (HU25)
 * Fuente: src/modules/networking/networking.schemas.ts
 * ============================================================================
 * Objetivo:
 *   Validar el contrato de entrada que recibe la API para guardar el carnet de
 *   networking, sin depender de la implementacion interna del servicio ni de la
 *   BD. Se observan solo entradas y salidas del esquema.
 *
 * Criterio de aceptacion relacionado:
 *   El usuario decide si su carnet esta visible, puede compartirlo incluso sin
 *   red registrada, y como maximo puede registrar una red social valida.
 *
 * Campos de entrada observados desde API:
 *   optIn, links[], platform, url, label.
 *
 * La funcionalidad involucra mas de 4 campos de entrada porque el endpoint
 * `PUT /networking/me` recibe un objeto con:
 *   1) optIn
 *   2) links
 *   3) links[0].platform
 *   4) links[0].url
 *   5) links[0].label
 *
 * TABLA DE PARTICION DE EQUIVALENCIA + VALORES LIMITE:
 * | Caso | Clase evaluada                         | Entrada representativa                         | Esperado |
 * |------|----------------------------------------|------------------------------------------------|----------|
 * | CV1  | carnet visible sin enlaces             | optIn=true, links=[]                           | valido   |
 * | CV2  | carnet visible con una red valida      | website con url y label con espacios           | valido y trim |
 * | CNV1 | cantidad de redes fuera del limite     | dos enlaces en links[]                         | invalido |
 * | CNV2 | protocolo de URL no permitido          | ftp://github.com/a                             | invalido |
 * | CNV3 | dominio no coincide con la plataforma  | linkedin apuntando a example.com               | invalido |
 * | CNV4 | website/other sin nombre visible       | website sin label                              | invalido |
 *
 * Alcance:
 *   Esta prueba no revisa como se guarda el carnet. Solo comprueba el contrato
 *   publico de validacion que cualquier request debe cumplir antes de persistir.
 */

describe("CAJA NEGRA · HU25 updateNetworkingSchema", () => {
  /*
   * CV1 - Clase valida: carnet visible sin red social.
   * Entrada: optIn=true y links=[].
   * Resultado esperado: payload valido porque la HU25 permite compartir el
   * carnet aunque el usuario no haya registrado una red.
   */
  test("CV1: carnet visible sin enlace es valido", () => {
    expect(updateNetworkingSchema.safeParse({ optIn: true, links: [] }).success).toBe(true);
  });

  /*
   * CV2 - Clase valida con mas de 4 campos de entrada.
   * Entrada: optIn, links, platform, url y label. Se agregan espacios para
   * comprobar el contrato externo de normalizacion.
   * Resultado esperado: payload valido y strings normalizados por trim.
   */
  test("CV2: carnet visible con una red valida normaliza espacios", () => {
    const parsed = updateNetworkingSchema.safeParse({
      optIn: true,
      links: [{
        platform: "website",
        url: "  https://mel.dev  ",
        label: "  Portfolio  ",
      }],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.links[0].platform).toBe("website");
      expect(parsed.data.links[0].url).toBe("https://mel.dev");
      expect(parsed.data.links[0].label).toBe("Portfolio");
    }
  });

  /*
   * CNV1 - Clase invalida por limite de cantidad.
   * Entrada: links[] contiene dos redes sociales.
   * Resultado esperado: payload invalido porque el carnet admite como maximo
   * una red.
   */
  test("CNV1: no acepta mas de una red", () => {
    expect(updateNetworkingSchema.safeParse({
      optIn: true,
      links: [
        { platform: "github", url: "https://github.com/a" },
        { platform: "instagram", url: "https://instagram.com/a" },
      ],
    }).success).toBe(false);
  });

  /*
   * CNV2 - Clase invalida por protocolo.
   * Entrada: url absoluta con protocolo ftp.
   * Resultado esperado: payload invalido; solo se aceptan http:// o https://.
   */
  test("CNV2: rechaza protocolo distinto de HTTP(S)", () => {
    expect(socialLinkSchema.safeParse({ platform: "github", url: "ftp://github.com/a" }).success).toBe(false);
  });

  /*
   * CNV3 - Clase invalida por dominio/plataforma.
   * Entrada: platform=linkedin pero url apunta a example.com.
   * Resultado esperado: payload invalido porque la URL no pertenece al dominio
   * esperado para LinkedIn.
   */
  test("CNV3: rechaza dominio que no corresponde a la plataforma", () => {
    expect(socialLinkSchema.safeParse({ platform: "linkedin", url: "https://example.com/in/a" }).success).toBe(false);
  });

  /*
   * CNV4 - Clase invalida/valida para etiqueta.
   * Entrada invalida: website sin label.
   * Entrada valida: other con label visible.
   * Resultado esperado: website/other requieren una etiqueta para que el carnet
   * muestre un nombre entendible de la red.
   */
  test("CNV4: website y other requieren label", () => {
    expect(socialLinkSchema.safeParse({ platform: "website", url: "https://mel.dev" }).success).toBe(false);
    expect(socialLinkSchema.safeParse({ platform: "other", url: "https://mel.dev", label: "Portfolio" }).success).toBe(true);
  });
});
