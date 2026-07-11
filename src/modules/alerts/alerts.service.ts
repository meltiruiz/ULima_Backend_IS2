import type { EventBus } from "../../events/index.js";
import type { AlertsRepository, EnrollmentWithScore, StoredAlert } from "./alerts.repository.js";
import { aggregateCourseScores, isAcademicRisk, personalAverage } from "./alerts.logic.js";

export class AlertsService {
  constructor(
    readonly repository: AlertsRepository,
    readonly events: EventBus,
  ) {}

  private buildCourseMap(enrollments: EnrollmentWithScore[]): Map<string, { courseName: string; sectionCode: string }> {
    const map = new Map<string, { courseName: string; sectionCode: string }>();
    for (const e of enrollments) {
      if (!map.has(e.course_name)) {
        map.set(e.course_name, { courseName: e.course_name, sectionCode: e.section_code ?? "" });
      }
    }
    return map;
  }

  private augmentAlerts(alerts: StoredAlert[], courseMap: Map<string, { courseName: string; sectionCode: string }>): StoredAlert[] {
    return alerts.map(a => {
      if (a.type === "academic_risk") {
        let courseNameFromTitle: string | null = null;
        if (a.title.startsWith("Riesgo Académico: ")) {
          courseNameFromTitle = a.title.replace("Riesgo Académico: ", "").trim();
        } else if (a.title.startsWith("Alerta de inasistencias - ")) {
          courseNameFromTitle = a.title.replace("Alerta de inasistencias - ", "").trim();
        }
        if (courseNameFromTitle) {
          const info = courseMap.get(courseNameFromTitle);
          if (info) {
            return { ...a, courseName: info.courseName, sectionCode: info.sectionCode };
          }
        }
      }
      return a;
    });
  }

  async getAlertsForStudent(studentId: number): Promise<StoredAlert[]> {
    const enrollments = await this.repository.getActiveEnrollmentsWithScores(studentId);
    const courseMap = this.buildCourseMap(enrollments);
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

    // Return all alerts augmented with course info
    const alerts = await this.repository.getAlerts(studentId);
    return this.augmentAlerts(alerts, courseMap);
  }

  async markAlertAsRead(studentId: number, alertId: number): Promise<boolean> {
    return await this.repository.markAlertAsRead(studentId, alertId);
  }
}

