import type { EventBus } from "../../events/index.js";
import type { AttendanceRiskRepository } from "./attendance-risk.repository.js";
import type {
  AttendanceRiskResponse,
  AttendanceRiskStudentResponse,
  AttendanceRiskSummary,
  StudentRiskStatus,
} from "./attendance-risk.types.js";

const splitName = (fullName: string) => {
  if (fullName.includes(",")) {
    const parts = fullName.split(",");
    return {
      lastName: parts[0].trim(),
      firstName: parts.slice(1).join(",").trim(),
    };
  }

  const parts = fullName.trim().split(/\s+/);
  if (parts.length > 2) {
    return {
      lastName: parts.slice(0, 2).join(" "),
      firstName: parts.slice(2).join(" "),
    };
  }
  if (parts.length === 2) {
    return {
      lastName: parts[0],
      firstName: parts[1],
    };
  }

  return {
    firstName: fullName,
    lastName: "",
  };
};

const classifyStudent = (row: {
  absent_hours: string;
  total_section_hours: string;
  current_level: number | null;
  full_name: string;
  code: string;
}, sessionHours: number): AttendanceRiskStudentResponse | null => {
  const absentHours = Number(row.absent_hours);
  const totalSectionHours = Number(row.total_section_hours);

  if (totalSectionHours <= 0) return null;

  const absencePercentage = (absentHours / totalSectionHours) * 100;
  const currentLevel = row.current_level;
  const limit = currentLevel != null && currentLevel >= 6 ? 35 : 25;

  if (absencePercentage > limit) {
    const { firstName, lastName } = splitName(row.full_name);
    return {
      code: row.code,
      firstName,
      lastName,
      currentLevel,
      absentHours,
      totalHours: totalSectionHours,
      absencePercentage: Math.round(absencePercentage * 100) / 100,
      status: "impedido" as StudentRiskStatus,
      missingFaltas: null,
    };
  }

  const maxAllowedAbsentHours = totalSectionHours * limit / 100;
  const remainingAbsentHours = maxAllowedAbsentHours - absentHours;
  const faltasRemaining = Math.ceil(remainingAbsentHours / sessionHours);

  if (faltasRemaining === 2 || faltasRemaining === 3) {
    const { firstName, lastName } = splitName(row.full_name);
    return {
      code: row.code,
      firstName,
      lastName,
      currentLevel,
      absentHours,
      totalHours: totalSectionHours,
      absencePercentage: Math.round(absencePercentage * 100) / 100,
      status: "en_riesgo" as StudentRiskStatus,
      missingFaltas: faltasRemaining,
    };
  }

  return null;
};

const computeSummary = (students: AttendanceRiskStudentResponse[]): AttendanceRiskSummary => {
  let impedido = 0;
  let en_riesgo = 0;
  for (const s of students) {
    if (s.status === "impedido") impedido++;
    else if (s.status === "en_riesgo") en_riesgo++;
  }
  return { impedido, en_riesgo, total: impedido + en_riesgo };
};

export class AttendanceRiskService {
  constructor(
    readonly repository: AttendanceRiskRepository,
    readonly events: EventBus,
  ) {}

  async getAttendanceRisk(sectionId: number): Promise<AttendanceRiskResponse> {
    const rows = await this.repository.findStudentsBySectionId(sectionId);
    const sessionHours = 2;
    const students: AttendanceRiskStudentResponse[] = [];

    for (const row of rows) {
      const student = classifyStudent(row, sessionHours);
      if (student) students.push(student);
    }

    return { students, summary: computeSummary(students) };
  }

  async getAttendanceRiskSummary(sectionId: number): Promise<{ summary: AttendanceRiskSummary }> {
    const rows = await this.repository.findStudentsBySectionId(sectionId);
    const sessionHours = 2;
    let impedido = 0;
    let en_riesgo = 0;

    for (const row of rows) {
      const student = classifyStudent(row, sessionHours);
      if (student) {
        if (student.status === "impedido") impedido++;
        else if (student.status === "en_riesgo") en_riesgo++;
      }
    }

    return { summary: { impedido, en_riesgo, total: impedido + en_riesgo } };
  }

  async notifyStudents(sectionId: number): Promise<{ notified: number; message: string }> {
    const rows = await this.repository.findStudentDetailsBySectionId(sectionId);
    const sessionHours = 2;
    const alerts: { studentId: number; type: string; title: string; message: string }[] = [];

    for (const row of rows) {
      const absentHours = Number(row.absent_hours);
      const totalSectionHours = Number(row.total_section_hours);
      if (totalSectionHours <= 0) continue;

      const absencePercentage = (absentHours / totalSectionHours) * 100;
      const currentLevel = row.current_level;
      const limit = currentLevel != null && currentLevel >= 6 ? 35 : 25;
      const pct = Math.round(absencePercentage * 100) / 100;
      const courseName = row.course_name;
      const sectionCode = row.section_code;

      let title: string;
      let message: string;

      if (absencePercentage > limit) {
        title = `Alerta de inasistencias - ${courseName}`;
        message = `Has superado el límite de inasistencias permitidas (${limit}%) en ${courseName} (Sección ${sectionCode}). Tu porcentaje actual es de ${pct}%.`;
      } else {
        const maxAllowed = totalSectionHours * limit / 100;
        const remaining = maxAllowed - absentHours;
        const faltas = Math.ceil(remaining / sessionHours);
        if (faltas !== 2 && faltas !== 3) continue;

        title = `Alerta de inasistencias - ${courseName}`;
        message = `Estás a ${faltas} falta(s) de alcanzar el límite de inasistencias (${limit}%) en ${courseName} (Sección ${sectionCode}). Tu porcentaje actual es de ${pct}%.`;
      }

      alerts.push({ studentId: row.student_id, type: "academic_risk", title, message });
    }

    const notified = await this.repository.createAlerts(alerts);
    const msg = notified > 0
      ? `Se ${notified === 1 ? "ha" : "han"} notificado a ${notified} alumno${notified === 1 ? "" : "s"}.`
      : "No hay alumnos que notificar.";
    return { notified, message: msg };
  }
}
