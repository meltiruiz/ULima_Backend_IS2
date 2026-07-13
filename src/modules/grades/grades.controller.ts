import type { Context } from "hono";
import { validateJson, validateParams } from "../../shared/middleware/validate-dto.js";
import { HttpError } from "../../shared/errors/http-error.js";
import type { GradesService } from "./grades.service.js";
import { calculateAverageSchema, saveNotasSchema, deleteNotaParamsSchema } from "./grades.schemas.js";

export class GradesController {
  constructor(readonly service: GradesService) {}

  async getMeCourses(c: Context) {
    try {
      const code = c.req.query("code");
      const result = await this.service.getCoursesAndSyllabi(code);
      return c.json(result);
    } catch (e) {
      console.error("Error in getMeCourses", e);
      return c.json({ cursos: [], syllabi: [] });
    }
  }

  async calculateAverage(c: Context) {
    try {
      const body = await validateJson(c, calculateAverageSchema);
      const result = this.service.calculateAverage(body.notas);
      return c.json(result);
    } catch (e) {
      console.error("Error in calculateAverage", e);
      return c.json({ error: "Invalid request body" }, 400);
    }
  }

  async saveNotas(c: Context) {
    try {
      const body = await validateJson(c, saveNotasSchema);
      const studentId = c.get("studentId") as number;
      await this.service.saveNotas(studentId, body);
      return c.json({ message: "Notas guardadas correctamente" });
    } catch (e) {
      if (e instanceof HttpError) throw e;
      console.error("Error in saveNotas", e);
      return c.json({ error: "Error al guardar notas" }, 500);
    }
  }

  async loadNotas(c: Context) {
    try {
      const studentId = c.get("studentId") as number;
      const result = await this.service.loadNotas(studentId);
      return c.json(result);
    } catch (e) {
      console.error("Error in loadNotas", e);
      return c.json({ cursos: [] });
    }
  }

  async deleteNota(c: Context) {
    try {
      const { sectionId, assessmentId } = validateParams(c, deleteNotaParamsSchema);
      const studentId = c.get("studentId") as number;
      await this.service.deleteNota(studentId, sectionId, assessmentId);
      return c.json({ message: "Nota eliminada correctamente" });
    } catch (e) {
      if (e instanceof HttpError) throw e;
      console.error("Error in deleteNota", e);
      return c.json({ error: "Error al eliminar nota" }, 500);
    }
  }
}
