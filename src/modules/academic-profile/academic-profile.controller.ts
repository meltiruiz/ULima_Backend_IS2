import type { Context } from "hono";
import type { AcademicProfileService } from "./academic-profile.service";
import { validateJson } from "../../shared/middleware/validate-dto";
import { updateSpecialtiesSchema } from "./academic-profile.schemas";

export class AcademicProfileController {
  constructor(readonly service: AcademicProfileService) {}

  async getProfile(c: Context) {
    const userId = c.get("userId");
    const role = c.get("role");
    const result = await this.service.getProfile(userId, role);
    return c.json(result);
  }

  async getCareers(c: Context) {
    const result = await this.service.getCareers();
    return c.json(result);
  }

  async getSpecialties(c: Context) {
    const userId = c.get("userId");
    const careerIdQuery = c.req.query("careerId");
    const careerId = careerIdQuery ? parseInt(careerIdQuery, 10) : undefined;
    const result = await this.service.getSpecialties(userId, careerId);
    return c.json(result);
  }

  async updateSpecialties(c: Context) {
    const userId = c.get("userId");
    const body = await validateJson(c, updateSpecialtiesSchema);
    const result = await this.service.updateSpecialties(userId, body);
    return c.json(result);
  }
}
