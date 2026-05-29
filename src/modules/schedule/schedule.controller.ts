import type { Context } from "hono";
import type { ScheduleService } from "./schedule.service";

export class ScheduleController {
  constructor(readonly service: ScheduleService) {}

  async getSessions(c: Context) {
    const studentId = Number(c.get("studentId"));
    return c.json(await this.service.getSessions(studentId));
  }

  async getAssessments(c: Context) {
    const studentId = Number(c.get("studentId"));
    return c.json(await this.service.getAssessments(studentId));
  }

  async getWeeklyLoad(c: Context) {
    const studentId = Number(c.get("studentId"));
    return c.json(await this.service.getWeeklyLoad(studentId));
  }
}
