import type { Context } from "hono";
import type { SimulatedGradesService } from "./simulated-grades.service.js";
import { validateJson } from "../../shared/middleware/validate-dto.js";
import { HttpError } from "../../shared/errors/http-error.js";
import { upsertSimulatedGradesSchema } from "./simulated-grades.schemas.js";

export class SimulatedGradesController {
  constructor(readonly service: SimulatedGradesService) {}

  async list(c: Context) {
    const studentId = c.get("studentId");
    const grades = await this.service.listForStudent(studentId);
    return c.json({ grades });
  }

  async upsert(c: Context) {
    const studentId = c.get("studentId");
    const body = await validateJson(c, upsertSimulatedGradesSchema);
    const grades = await this.service.upsertForStudent(studentId, body.grades);
    return c.json({ grades });
  }

  async remove(c: Context) {
    const studentId = c.get("studentId");
    const assessmentId = parseInt(c.req.param("assessmentId") ?? "", 10);
    if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
      throw new HttpError(400, "assessmentId inválido.", "INVALID_ASSESSMENT_ID");
    }
    await this.service.deleteForStudent(studentId, assessmentId);
    return c.json({ message: "Simulated grade removed" });
  }
}
