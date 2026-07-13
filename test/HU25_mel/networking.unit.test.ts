/*
  bun test test/HU25_mel/networking.unit.test.ts
*/
import { describe, expect, test } from "bun:test";
import { validateSocialLink } from "../../src/modules/networking/networking.logic.js";

/**
 * ============================================================================
 * PRUEBA UNITARIA - Metodo validateSocialLink() (HU25)
 * Fuente: src/modules/networking/networking.logic.ts
 * ============================================================================
 * Objetivo:
 *   Validar un unico metodo puro que decide si una red social del carnet es
 *   aceptable antes de persistirla. No se instancia servidor, no se usa HTTP y
 *   no se toca la BD.
 *
 * Criterio de aceptacion relacionado:
 *   El carnet permite registrar como maximo una red valida. Cada red debe usar
 *   URL http/https, corresponder al dominio esperado de su plataforma, y para
 *   `website` / `other` debe incluir una etiqueta visible.
 *
 * Metodo bajo prueba:
 *   validateSocialLink(link)
 *
 * CASOS UNITARIOS DEL MISMO METODO:
 * | Caso | Entrada                                           | Esperado          |
 * |------|---------------------------------------------------|-------------------|
 * | U1   | github con https y dominio oficial                | ok                |
 * | U2   | github con protocolo ftp                          | invalid_url       |
 * | U3   | linkedin apuntando a example.com                  | invalid_domain    |
 * | U4   | website sin label                                 | label_required    |
 * | U5   | website con label solo espacios                   | label_required    |
 * | U6   | other con label visible                           | ok                |
 *
 * Alcance:
 *   Esta es la prueba unitaria exigida por rubrica: un metodo concreto con al
 *   menos 4 casos de prueba que validan su funcionamiento correcto.
 */

describe("UNITARIA · HU25 validateSocialLink()", () => {
  /*
   * U1 - Caso valido base.
   * Entrada: plataforma github con URL https y dominio oficial github.com.
   * Resultado esperado: validateSocialLink retorna status "ok".
   */
  test("U1: acepta plataforma con URL https y dominio oficial", () => {
    expect(validateSocialLink({
      platform: "github",
      url: "https://github.com/mel",
    }).status).toBe("ok");
  });

  /*
   * U2 - Caso invalido por URL.
   * Entrada: plataforma github con URL ftp://.
   * Resultado esperado: status "invalid_url" porque el metodo solo admite
   * enlaces http o https.
   */
  test("U2: rechaza URL sin protocolo HTTP(S)", () => {
    expect(validateSocialLink({
      platform: "github",
      url: "ftp://github.com/mel",
    }).status).toBe("invalid_url");
  });

  /*
   * U3 - Caso invalido por dominio.
   * Entrada: plataforma linkedin con dominio example.com.
   * Resultado esperado: status "invalid_domain" porque el dominio no coincide
   * con la plataforma seleccionada.
   */
  test("U3: rechaza URL cuyo dominio no corresponde a la plataforma", () => {
    expect(validateSocialLink({
      platform: "linkedin",
      url: "https://example.com/in/mel",
    }).status).toBe("invalid_domain");
  });

  /*
   * U4 - Caso invalido por ausencia de label.
   * Entrada: platform=website con URL valida pero sin label.
   * Resultado esperado: status "label_required" porque website necesita una
   * etiqueta visible para mostrarse en el carnet.
   */
  test("U4: website sin label retorna label_required", () => {
    expect(validateSocialLink({
      platform: "website",
      url: "https://mel.dev",
    }).status).toBe("label_required");
  });

  /*
   * U5 - Caso invalido por label vacio.
   * Entrada: platform=website con label compuesto solo por espacios.
   * Resultado esperado: status "label_required" porque luego del trim no queda
   * texto util.
   */
  test("U5: website con label vacio tras trim retorna label_required", () => {
    expect(validateSocialLink({
      platform: "website",
      url: "https://mel.dev",
      label: "   ",
    }).status).toBe("label_required");
  });

  /*
   * U6 - Caso valido para plataforma generica.
   * Entrada: platform=other, URL http/https valida y label visible.
   * Resultado esperado: status "ok" porque cumple la regla especial de label.
   */
  test("U6: other con label visible es valido", () => {
    expect(validateSocialLink({
      platform: "other",
      url: "https://mel.dev",
      label: "Portfolio",
    }).status).toBe("ok");
  });
});
