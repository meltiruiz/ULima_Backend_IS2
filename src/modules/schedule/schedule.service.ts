import type { EventBus } from "../../events";
import type { ScheduleRepository, RawWeekRow, RawAssessmentRow } from "./schedule.repository";
import type {
  SessionsResponse,
  SectionResponse,
  DayInfo,
  AssessmentsResult,
  AssessmentResponse,
  WeeklyLoadResponse,
  WeeklyLoadItem,
} from "./schedule.types";

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function formatDateText(date: Date): string {
  return `${date.getDate()} de ${monthNames[date.getMonth()]}`;
}

function formatTimeToAmPm(timeStr: string): string {
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const ampm = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayHourStr = displayHour.toString().padStart(2, "0");
  const displayMinuteStr = minute.toString().padStart(2, "0");
  return `${displayHourStr}:${displayMinuteStr} ${ampm}`;
}

function getAcademicWeeks(): RawWeekRow[] {
  const weeks: RawWeekRow[] = [];
  const startDate = new Date(2026, 3, 6); // April 6, 2026

  for (let i = 1; i <= 16; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + (i - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = `${weekStart.getFullYear()}-${(weekStart.getMonth() + 1).toString().padStart(2, '0')}-${weekStart.getDate().toString().padStart(2, '0')}`;
    const endStr = `${weekEnd.getFullYear()}-${(weekEnd.getMonth() + 1).toString().padStart(2, '0')}-${weekEnd.getDate().toString().padStart(2, '0')}`;

    weeks.push({
      week_number: i,
      start_date: startStr,
      end_date: endStr,
    });
  }
  return weeks;
}

export class ScheduleService {
  constructor(
    readonly repository: ScheduleRepository,
    readonly events: EventBus,
  ) {}

  async getSessions(studentId: number): Promise<SessionsResponse> {
    const rows = await this.repository.findActiveEnrollmentsWithSessions(studentId);
    const weeks = getAcademicWeeks();

    const activeDayName = (day: number) =>
      ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][day - 1] ?? "Por definir";

    const sections = new Map<string, SectionResponse>();
    for (const row of rows) {
      const sectionId = String(row.section_id);
      if (!sections.has(sectionId)) {
        sections.set(sectionId, {
          idSeccion: sectionId,
          codigoSeccion: row.section_code,
          docenteCode: row.teacher_code ?? "",
          promedioSeccion: 0,
          idCurso: String(row.course_id),
          curso: row.course_name,
          asistido: Number(row.attended_hours ?? 0),
          inasistencia: Number(row.absent_hours ?? 0),
          total: Number(row.total_hours ?? 0),
          horarios: [],
        });
      }

      if (row.day_of_week != null) {
        const startTime = row.start_time ?? "08:00:00";
        const endTime = row.end_time ?? "10:00:00";
        const formattedStart = formatTimeToAmPm(startTime);
        const formattedEnd = formatTimeToAmPm(endTime);

        sections.get(sectionId)!.horarios.push({
          dia: activeDayName(Number(row.day_of_week)),
          inicio: startTime,
          hora_inicio: formattedStart,
          fin: endTime,
          hora_fin: formattedEnd,
          aula: row.classroom ?? "Por definir",
          salon: row.classroom ?? "Por definir",
          color: row.color_hex ?? "blue",
        });
      }
    }

    // Dynamic days computation based on active week
    const today = new Date();
    let activeWeek = weeks[0];
    for (const week of weeks) {
      const start = new Date(week.start_date);
      const end = new Date(week.end_date);
      end.setHours(23, 59, 59, 999);
      if (today >= start && today <= end) {
        activeWeek = week;
        break;
      }
    }

    if (!activeWeek && weeks.length > 0) {
      activeWeek = weeks[0];
    }

    const daysList: DayInfo[] = [];
    if (activeWeek) {
      const startDate = new Date(activeWeek.start_date);
      const weekNum = activeWeek.week_number;
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        daysList.push({
          dayName: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][i],
          dateText: formatDateText(currentDate),
          weekText: `Semana ${weekNum} del ciclo`,
        });
      }
    } else {
      for (let i = 0; i < 7; i++) {
        daysList.push({
          dayName: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][i],
          dateText: "",
          weekText: "Semana actual",
        });
      }
    }

    return {
      days: daysList,
      secciones: Array.from(sections.values()),
    };
  }

  async getAssessments(studentId: number): Promise<AssessmentsResult> {
    const rawAssessments = await this.repository.findActiveSyllabiAndAssessments(studentId);
    const weeks = getAcademicWeeks();

    const weeksMap = new Map<number, RawWeekRow>();
    for (const w of weeks) {
      weeksMap.set(w.week_number, w);
    }

    const assessmentsList: AssessmentResponse[] = [];
    const seen = new Set<string>();

    const rowsByAssessment = new Map<number, RawAssessmentRow[]>();
    for (const row of rawAssessments) {
      if (!rowsByAssessment.has(row.assessment_id)) {
        rowsByAssessment.set(row.assessment_id, []);
      }
      rowsByAssessment.get(row.assessment_id)!.push(row);
    }

    for (const [, rows] of rowsByAssessment.entries()) {
      const validSessions = rows.filter((r) => r.day_of_week != null);
      if (validSessions.length === 0) {
        const row = rows[0];
        const startTime = row.start_time ?? "08:00:00";
        const endTime = row.end_time ?? "10:00:00";

        assessmentsList.push({
          id: String(row.assessment_id),
          courseName: row.course_name,
          sectionCode: row.section_code,
          code: row.assessment_code,
          name: row.assessment_name,
          weekNumber: row.assessment_week_number,
          date: "",
          startTime: startTime,
          endTime: endTime,
          classroom: row.classroom ?? "Por definir",
          color: row.color_hex ?? "blue",
        });
      } else {
        for (const row of validSessions) {
          if (row.day_of_week == null) continue;

          const week = weeksMap.get(row.assessment_week_number);
          let calculatedDateStr = "";
          if (week) {
            const weekStart = new Date(week.start_date);
            const dayOffset = row.day_of_week - 1;
            const calculatedDate = new Date(weekStart);
            calculatedDate.setDate(weekStart.getDate() + dayOffset);
            calculatedDateStr = calculatedDate.toISOString().split("T")[0];
          }

          const key = `${row.assessment_id}-${calculatedDateStr}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const startTime = row.start_time ?? "08:00:00";
          const endTime = row.end_time ?? "10:00:00";

          assessmentsList.push({
            id: String(row.assessment_id),
            courseName: row.course_name,
            sectionCode: row.section_code,
            code: row.assessment_code,
            name: row.assessment_name,
            weekNumber: row.assessment_week_number,
            date: calculatedDateStr,
            startTime: startTime,
            endTime: endTime,
            classroom: row.classroom ?? "Por definir",
            color: row.color_hex ?? "blue",
          });
        }
      }
    }

    return {
      assessments: assessmentsList.sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getWeeklyLoad(studentId: number): Promise<WeeklyLoadResponse> {
    const assessmentsResult = await this.getAssessments(studentId);
    const weeks = getAcademicWeeks();

    const uniqueAssessmentsInWeek = new Map<number, Set<string>>();
    for (const ass of assessmentsResult.assessments) {
      const weekNum = ass.weekNumber;
      if (!uniqueAssessmentsInWeek.has(weekNum)) {
        uniqueAssessmentsInWeek.set(weekNum, new Set<string>());
      }
      uniqueAssessmentsInWeek.get(weekNum)!.add(ass.id);
    }

    const weeksList: WeeklyLoadItem[] = [];
    for (const week of weeks) {
      const weekNum = week.week_number;
      const count = uniqueAssessmentsInWeek.get(weekNum)?.size ?? 0;
      weeksList.push({
        weekNumber: weekNum,
        startDate: week.start_date,
        endDate: week.end_date,
        assessmentCount: count,
        isHighLoad: count >= 3,
      });
    }

    return {
      weeks: weeksList,
    };
  }
}
