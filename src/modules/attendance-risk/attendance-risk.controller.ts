import type { Context } from "hono";
import { validateParams } from "../../shared/middleware/validate-dto.js";
import type { AttendanceRiskService } from "./attendance-risk.service.js";
import { sectionIdParamSchema } from "./attendance-risk.schemas.js";

export class AttendanceRiskController {
  constructor(readonly service: AttendanceRiskService) {}

  async getAttendanceRisk(c: Context) {
    const { sectionId } = validateParams(c, sectionIdParamSchema);
    return c.json(await this.service.getAttendanceRisk(sectionId));
  }

  async getAttendanceRiskSummary(c: Context) {
    const { sectionId } = validateParams(c, sectionIdParamSchema);
    return c.json(await this.service.getAttendanceRiskSummary(sectionId));
  }

  async notifyStudents(c: Context) {
    const { sectionId } = validateParams(c, sectionIdParamSchema);
    return c.json(await this.service.notifyStudents(sectionId));
  }
}
