import { db } from "../../db/index.js";
import { firebaseService } from "../../services/firebase.service.js";
import { HttpError } from "../../shared/errors/http-error.js";
import { canIssueToken } from "./chat.logic.js";
import { ChatRepository } from "./chat.repository.js";

export class ChatController {
  constructor(readonly repository = new ChatRepository(db)) {}

  async createFirebaseToken(input: {
    sectionId: number;
    userId: number;
    role: string;
    studentId?: number;
    teacherId?: number;
  }) {
    const participant = input.role === "teacher"
      ? input.teacherId == null
        ? null
        : await this.repository.findTeacherParticipant(input.teacherId, input.sectionId)
      : input.studentId == null
        ? null
        : await this.repository.findStudentParticipant(input.studentId, input.sectionId);

    if (!canIssueToken(participant, input.userId)) {
      throw new HttpError(
        403,
        "No perteneces a esta sección o no tienes acceso al chat.",
        "CHAT_SECTION_FORBIDDEN",
      );
    }

    await firebaseService.upsertChatMember(participant);

    const token = await firebaseService.generateCustomToken(participant.uid, {
      role: participant.role,
      sectionId: participant.sectionId,
      moderator: participant.isModerator,
      weight: participant.weight,
    });

    return {
      token,
      uid: participant.uid,
      displayName: participant.displayName,
      role: participant.role,
      roleLabel: participant.roleLabel,
      isModerator: participant.isModerator,
      weight: participant.weight,
    };
  }

  /**
   * HU23: elimina (borrado suave) un mensaje del chat de la sección. Autorización:
   * SOLO el **profesor titular** de esa sección (rol `teacher`, no el JP ni
   * representantes). Escribe la lápida vía Admin SDK; el mensaje queda como
   * "eliminado por <profesor>". 403 si no es el profesor de la sección.
   */
  async deleteMessage(input: {
    sectionId: number;
    messageId: string;
    userId: number;
    teacherId?: number;
  }) {
    const participant = input.teacherId == null
      ? null
      : await this.repository.findTeacherParticipant(input.teacherId, input.sectionId);

    if (
      participant == null ||
      participant.userId !== input.userId ||
      participant.role !== "teacher"
    ) {
      throw new HttpError(
        403,
        "Solo el profesor del curso puede eliminar mensajes.",
        "CHAT_DELETE_FORBIDDEN",
      );
    }

    const result = await firebaseService.softDeleteChatMessage(
      input.sectionId,
      input.messageId,
      {
        deletedBy: participant.displayName,
        deletedByUid: participant.uid,
        deletedByRole: participant.role,
      },
    );

    if (!result.existed) {
      throw new HttpError(404, "El mensaje no existe.", "CHAT_MESSAGE_NOT_FOUND");
    }

    return {
      deleted: true,
      messageId: input.messageId,
      deletedBy: participant.displayName,
    };
  }
}
