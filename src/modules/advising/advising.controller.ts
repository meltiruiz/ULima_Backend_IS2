import type { Context } from "hono";
import type { AdvisingService } from "./advising.service.js";
import { HttpError } from "../../shared/errors/http-error.js";
import { validateJson, validateParams } from "../../shared/middleware/validate-dto.js";
import { advisingIdParamSchema, createAdvisingSchema, sectionIdParamSchema } from "./advising.schemas.js";

export class AdvisingController {
  constructor(readonly service: AdvisingService) {}

  private requireTeacherId(c: Context): number {
    const teacherId = c.get("teacherId");
    if (!teacherId) throw new HttpError(401, "No autorizado. Docente no encontrado.", "TEACHER_NOT_FOUND");
    return Number(teacherId);
  }

  async getSections(c: Context) {
    return c.json(await this.service.getSections(this.requireTeacherId(c)));
  }

  async getSessions(c: Context) {
    return c.json(await this.service.getSessions(this.requireTeacherId(c)));
  }

  async createSession(c: Context) {
    const body = await validateJson(c, createAdvisingSchema);
    return c.json(await this.service.createSession(this.requireTeacherId(c), body), 201);
  }

  async deleteSession(c: Context) {
    const { id } = validateParams(c, advisingIdParamSchema);
    return c.json(await this.service.deleteSession(this.requireTeacherId(c), id));
  }

  async getAttendees(c: Context) {
    const { id } = validateParams(c, advisingIdParamSchema);
    return c.json(await this.service.getAttendees(this.requireTeacherId(c), id));
  }

  /** GET /section/:sectionId — accesible para alumnos y docentes. */
  async getSessionsBySection(c: Context) {
    const { sectionId } = validateParams(c, sectionIdParamSchema);
    // studentId sólo está presente en tokens de alumno.
    const studentId = c.get("studentId") as number | undefined;
    return c.json(await this.service.getSessionsBySection(sectionId, studentId));
  }
}
