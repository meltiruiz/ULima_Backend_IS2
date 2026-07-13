import type { ChatParticipant, ChatParticipantRole } from "./chat.types.js";

/**
 * Lógica pura del chat (HU23): derivación de rol/peso/moderador y autorización.
 * Sin dependencias de BD ni Firebase para ser 100% testeable en el stack.
 */

/** Etiqueta legible del rol dentro del chat de la sección. */
export const roleLabel = (role: ChatParticipantRole): string => {
  switch (role) {
    case "teacher":
      return "Profesor";
    case "jp":
      return "Jefe de Práctica";
    case "delegate":
      return "Delegado";
    case "subdelegate":
      return "Subdelegado";
    case "student":
      return "Alumno";
  }
};

/**
 * Peso de ordenamiento/jerarquía del rol. Mayor = más autoridad.
 * Se expone en el custom token para que el cliente ordene/priorice.
 */
export const roleWeight = (role: ChatParticipantRole): number => {
  switch (role) {
    case "teacher":
      return 100;
    case "jp":
      return 90;
    case "delegate":
      return 70;
    case "subdelegate":
      return 60;
    case "student":
      return 10;
  }
};

/** Un moderador puede borrar cualquier mensaje; el alumno raso solo el suyo. */
export const isModeratorRole = (role: ChatParticipantRole): boolean =>
  role === "teacher" ||
  role === "jp" ||
  role === "delegate" ||
  role === "subdelegate";

/**
 * Rol de chat de un alumno según su `position` en `section_representative`.
 * `null` (no es representante) ⇒ alumno raso.
 */
export const studentRoleFromPosition = (
  position: "delegate" | "subdelegate" | null,
): ChatParticipantRole => position ?? "student";

/** Arma el participante de chat a partir de una fila (user_id, full_name) y su rol. */
export const buildParticipant = (
  row: { user_id: number; full_name: string },
  sectionId: number,
  role: ChatParticipantRole,
): ChatParticipant => ({
  uid: String(row.user_id),
  userId: Number(row.user_id),
  sectionId,
  displayName: row.full_name,
  role,
  roleLabel: roleLabel(role),
  isModerator: isModeratorRole(role),
  weight: roleWeight(role),
});

/**
 * ¿Se le puede emitir token de chat a este solicitante?
 * Solo si el participante existe (pertenece a la sección) y su `userId`
 * coincide con el del JWT (defensa contra suplantación por parámetro).
 */
export const canIssueToken = (
  participant: ChatParticipant | null,
  requestUserId: number,
): participant is ChatParticipant =>
  participant != null && participant.userId === requestUserId;
