import { db } from "../../db/index.js";
import { firebaseService } from "../../services/firebase.service.js";
import { HttpError } from "../../shared/errors/http-error.js";
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

    if (!participant || participant.userId !== input.userId) {
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
}
