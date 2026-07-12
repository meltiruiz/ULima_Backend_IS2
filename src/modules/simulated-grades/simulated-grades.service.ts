import type { EventBus } from "../../events/index.js";
import type { SimulatedGradesRepository } from "./simulated-grades.repository.js";
import type { SimulatedGrade } from "./simulated-grades.types.js";
import type { SimulatedGradeEntry } from "./simulated-grades.schemas.js";
import { HttpError } from "../../shared/errors/http-error.js";

export class SimulatedGradesService {
  constructor(
    readonly repository: SimulatedGradesRepository,
    readonly events: EventBus,
  ) {}

  async listForStudent(studentId: number): Promise<SimulatedGrade[]> {
    const rows = await this.repository.findByStudent(studentId);
    return rows.map((r) => ({
      assessmentId: Number(r.assessmentId),
      sectionId: Number(r.sectionId),
      value: Number(r.value),
    }));
  }

  // Upsert por lote. Cada evaluación se valida contra las matrículas del alumno;
  // si alguna no le corresponde, se rechaza toda la operación (404) para no
  // guardar parcialmente. Devuelve la lista completa vigente del alumno.
  async upsertForStudent(studentId: number, grades: SimulatedGradeEntry[]): Promise<SimulatedGrade[]> {
    const resolved: Array<{ enrollmentId: number; entry: SimulatedGradeEntry }> = [];
    for (const entry of grades) {
      const enrollmentId = await this.repository.findEnrollmentForAssessment(studentId, entry.assessmentId);
      if (enrollmentId === null) {
        throw new HttpError(
          404,
          `La evaluación ${entry.assessmentId} no pertenece a un curso en el que estés matriculado.`,
          "ASSESSMENT_NOT_ENROLLED",
        );
      }
      resolved.push({ enrollmentId, entry });
    }

    for (const { enrollmentId, entry } of resolved) {
      await this.repository.upsert(enrollmentId, entry.assessmentId, entry.value);
    }

    return this.listForStudent(studentId);
  }

  async deleteForStudent(studentId: number, assessmentId: number): Promise<void> {
    const deleted = await this.repository.deleteByStudentAndAssessment(studentId, assessmentId);
    if (deleted === 0) {
      throw new HttpError(404, "No hay nota simulada para esa evaluación.", "SIMULATED_GRADE_NOT_FOUND");
    }
  }
}
