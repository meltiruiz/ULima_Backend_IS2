import type { EventBus } from "../../events/index.js";
import type { AlertsRepository, StoredAlert } from "./alerts.repository.js";

export class AlertsService {
  constructor(
    readonly repository: AlertsRepository,
    readonly events: EventBus,
  ) {}

  async getAlertsForStudent(studentId: number): Promise<StoredAlert[]> {
    const enrollments = await this.repository.getActiveEnrollmentsWithScores(studentId);
    const courseGroups = new Map<number, { name: string; gradedWeight: number; weightedSum: number; numExamenes: number }>();

    for (const row of enrollments) {
      if (!courseGroups.has(row.course_id)) {
        courseGroups.set(row.course_id, {
          name: row.course_name,
          gradedWeight: 0,
          weightedSum: 0,
          numExamenes: 0,
        });
      }

      const group = courseGroups.get(row.course_id)!;
      if (row.assessment_id !== null && row.score_value !== null) {
        const weight = Number(row.assessment_weight || 0);
        const value = Number(row.score_value);
        group.gradedWeight += weight;
        group.weightedSum += value * weight;
        group.numExamenes += 1;
      }
    }

    // Evaluate risk for each course
    for (const group of courseGroups.values()) {
      const promedioPersonal = group.gradedWeight > 0 ? (group.weightedSum / group.gradedWeight) : 0;
      // Threshold: progress > 55% AND average < 10.5
      if (group.gradedWeight > 55 && promedioPersonal < 10.5) {
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

    // Return all alerts
    return await this.repository.getAlerts(studentId);
  }

  async markAlertAsRead(studentId: number, alertId: number): Promise<boolean> {
    return await this.repository.markAlertAsRead(studentId, alertId);
  }
}

