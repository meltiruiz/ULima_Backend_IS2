import { describe, expect, test } from "bun:test";
import { chatTokenSchema } from "../../src/modules/chat/chat.schemas.js";
import { deleteParamsSchema } from "../../src/modules/chat/chat.routes.js";

const safe = (schema: { safeParse: (v: unknown) => { success: boolean } }, input: unknown) =>
  schema.safeParse(input);

describe("chatTokenSchema — caja negra", () => {
  test("válido: sectionId numérico positivo", () => {
    const r = safe(chatTokenSchema, { sectionId: 1 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.sectionId).toBe(1);
  });

  test("válido: coerce de string a number", () => {
    const r = safe(chatTokenSchema, { sectionId: "42" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.sectionId).toBe(42);
  });

  test("válido: número grande positivo", () => {
    const r = safe(chatTokenSchema, { sectionId: 999999 });
    expect(r.success).toBe(true);
  });

  test("inválido: objeto vacío (sin sectionId)", () => {
    expect(safe(chatTokenSchema, {}).success).toBe(false);
  });

  test("inválido: sectionId cero (no positivo)", () => {
    expect(safe(chatTokenSchema, { sectionId: 0 }).success).toBe(false);
  });

  test("inválido: sectionId negativo", () => {
    expect(safe(chatTokenSchema, { sectionId: -1 }).success).toBe(false);
  });

  test("inválido: sectionId decimal (no entero)", () => {
    expect(safe(chatTokenSchema, { sectionId: 1.5 }).success).toBe(false);
  });

  test("inválido: sectionId string no numérico", () => {
    expect(safe(chatTokenSchema, { sectionId: "abc" }).success).toBe(false);
  });

  test("inválido: sectionId null", () => {
    expect(safe(chatTokenSchema, { sectionId: null }).success).toBe(false);
  });
});

describe("deleteParamsSchema — caja negra", () => {
  test("válido: params completos", () => {
    const r = safe(deleteParamsSchema, { sectionId: 1, messageId: "-Nabc123" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sectionId).toBe(1);
      expect(r.data.messageId).toBe("-Nabc123");
    }
  });

  test("válido: coerce de sectionId desde string", () => {
    const r = safe(deleteParamsSchema, { sectionId: "5", messageId: "msg01" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.sectionId).toBe(5);
  });

  test("válido: messageId en borde máximo (200 chars)", () => {
    const r = safe(deleteParamsSchema, { sectionId: 1, messageId: "x".repeat(200) });
    expect(r.success).toBe(true);
  });

  test("válido: messageId en borde mínimo (1 char)", () => {
    const r = safe(deleteParamsSchema, { sectionId: 1, messageId: "a" });
    expect(r.success).toBe(true);
  });

  test("inválido: sin sectionId", () => {
    expect(safe(deleteParamsSchema, { messageId: "abc" }).success).toBe(false);
  });

  test("inválido: sin messageId", () => {
    expect(safe(deleteParamsSchema, { sectionId: 1 }).success).toBe(false);
  });

  test("inválido: sectionId cero", () => {
    expect(safe(deleteParamsSchema, { sectionId: 0, messageId: "abc" }).success).toBe(false);
  });

  test("inválido: sectionId negativo", () => {
    expect(safe(deleteParamsSchema, { sectionId: -1, messageId: "abc" }).success).toBe(false);
  });

  test("inválido: messageId vacío (< 1)", () => {
    expect(safe(deleteParamsSchema, { sectionId: 1, messageId: "" }).success).toBe(false);
  });

  test("inválido: messageId excede 200 caracteres (> max)", () => {
    expect(safe(deleteParamsSchema, { sectionId: 1, messageId: "x".repeat(201) }).success).toBe(false);
  });

  test("inválido: sectionId string no numérico", () => {
    expect(safe(deleteParamsSchema, { sectionId: "xyz", messageId: "abc" }).success).toBe(false);
  });
});
