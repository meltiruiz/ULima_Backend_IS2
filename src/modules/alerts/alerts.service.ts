import type { EventBus } from "../../events/index.js";
import type { AlertsRepository, StoredAlert } from "./alerts.repository.js";
import { aggregateCourseScores, isAcademicRisk, personalAverage } from "./alerts.logic.js";

export class AlertsService {
  constructor(
    readonly repository: AlertsRepository,
    readonly events: EventBus,
  ) {}

  async getAlertsForStudent(studentId: number): Promise<StoredAlert[]> {
    const enrollments = await this.repository.getActiveEnrollmentsWithScores(studentId);
    // Agregación y umbrales viven en alerts.logic.ts (puro, testeable).
    const courseGroups = aggregateCourseScores(enrollments);

    // Evaluate risk for each course
    for (const group of courseGroups) {
      if (isAcademicRisk(group.gradedWeight, group.weightedSum)) {
        const promedioPersonal = personalAverage(group.gradedWeight, group.weightedSum);
        const title = `Riesgo Académico: ${group.name}`;
        const exists = await this.repository.findAlertByTitle(studentId, title);
        if (!exists) {
          const message = `Tu promedio actual en ${group.name} es ${promedioPersonal.toFixed(2)} (avance evaluado del ${group.gradedWeight.toFixed(0)}%). Te sugerimos tomar asesorías.`;
          await this.repository.createAlert(studentId, "academic_risk", title, message);
        }
      }
    }

    // Evaluate high load weeks
    const highLoadWeeks = await this.repository.getHighLoadWeeks(studentId);
    for (const week of highLoadWeeks) {
      const title = `Alta Carga: Semana ${week.week_number}`;
      const exists = await this.repository.findAlertByTitle(studentId, title);
      if (!exists) {
        const message = `Tienes ${week.assessment_count} evaluaciones programadas en la semana ${week.week_number} de tu ciclo.`;
        await this.repository.createAlert(studentId, "high_load", title, message);
      }
    }

    // Retornar solo alertas del período activo actual para evitar que alertas
    // de semestres anteriores aparezcan en el buzón del alumno.
    const periodStart = await this.repository.getActivePeriodStart();
    return await this.repository.getAlerts(studentId, periodStart ?? undefined);
  }

  async markAlertAsRead(studentId: number, alertId: number): Promise<boolean> {
    return await this.repository.markAlertAsRead(studentId, alertId);
  }
}

