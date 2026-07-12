import type { Context } from "hono";
import { validateParams } from "../../shared/middleware/validate-dto.js";
import { HttpError } from "../../shared/errors/http-error.js";
import type { CourseDetailService } from "./course-detail.service.js";
import { advisingSessionIdParamSchema, sectionIdParamSchema } from "./course-detail.schemas.js";

export class CourseDetailController {
  constructor(readonly service: CourseDetailService) {}

  async getAnnouncements(c: Context) {
    const { sectionId } = validateParams(c, sectionIdParamSchema);
    return c.json(await this.service.getAnnouncements(sectionId));
  }

  async getAdvising(c: Context) {
    const { sectionId } = validateParams(c, sectionIdParamSchema);
    // HU17: `studentId` solo existe en tokens de alumno; con docente queda undefined.
    const studentId = c.get("studentId") as number | undefined;
    return c.json(await this.service.getAdvising(sectionId, studentId));
  }

  async getContacts(c: Context) {
    const { sectionId } = validateParams(c, sectionIdParamSchema);
    return c.json(await this.service.getContacts(sectionId));
  }

  /** HU17: alumno confirma asistencia a una asesoría (POST /advising/:sessionId/rsvp). */
  async confirmRsvp(c: Context) {
    const { sessionId } = validateParams(c, advisingSessionIdParamSchema);
    const studentId = this.requireStudentId(c);
    return c.json(await this.service.confirmRsvp(sessionId, studentId));
  }

  /** HU17: alumno cancela su asistencia (DELETE /advising/:sessionId/rsvp). */
  async cancelRsvp(c: Context) {
    const { sessionId } = validateParams(c, advisingSessionIdParamSchema);
    const studentId = this.requireStudentId(c);
    return c.json(await this.service.cancelRsvp(sessionId, studentId));
  }

  /** Solo un token de alumno lleva `studentId`; un docente no puede hacer RSVP. */
  private requireStudentId(c: Context): number {
    const studentId = c.get("studentId") as number | undefined;
    if (studentId == null) {
      throw new HttpError(403, "Solo los alumnos pueden confirmar asistencia.", "ADVISING_RSVP_STUDENT_ONLY");
    }
    return studentId;
  }
}
