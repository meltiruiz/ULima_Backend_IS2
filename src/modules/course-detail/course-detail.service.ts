import type { EventBus } from "../../events/index.js";
import { HttpError } from "../../shared/errors/http-error.js";
import type { CourseDetailRepository } from "./course-detail.repository.js";
import type {
  AdvisingResult,
  AnnouncementsResult,
  ContactsResult,
  RawContactTeacherRow,
  RsvpResult,
  TeacherResponse,
} from "./course-detail.types.js";

const dayName = (day: number) =>
  ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][day - 1] ?? "Por definir";

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

const formatDate = (value: Date | string | null) => {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
};

const representativeRole = (position: string) => {
  if (position === "delegate") return "DELEGADO";
  if (position === "subdelegate") return "SUBDELEGADO";
  return "estudiante";
};

const contactRole = (position: string | null) => {
  if (position === "delegate") return "delegado";
  if (position === "subdelegate") return "subdelegado";
  return "estudiante";
};

const mapTeacher = (row: RawContactTeacherRow): TeacherResponse => ({
  code: row.teacher_code ?? "",
  ...splitName(row.full_name),
});

export class CourseDetailService {
  constructor(
    readonly repository: CourseDetailRepository,
    readonly events: EventBus,
  ) {}

  async getAnnouncements(sectionId: number): Promise<AnnouncementsResult> {
    const rows = await this.repository.findAnnouncementsBySectionId(sectionId);

    return {
      anuncios: rows.map((row) => ({
        id: String(row.id),
        idSeccion: String(sectionId),
        titulo: row.title,
        mensaje: row.message,
        fecha: formatDate(row.published_at),
        autorCode: row.autor_code,
        autor: {
          code: row.autor_code,
          ...splitName(row.full_name),
          email: row.institutional_email,
          role: representativeRole(row.position),
          career_id: null,
          currentCycle: "2026-1",
          setupComplete: true,
        },
      })),
    };
  }

  async getAdvising(sectionId: number, studentId?: number): Promise<AdvisingResult> {
    const rows = await this.repository.findAdvisingBySectionId(sectionId, studentId);

    return {
      asesorias: rows.map((row) => ({
        id: String(row.id),
        courseId: String(row.course_offering_id),
        docenteCode: row.teacher_code ?? "",
        docente: {
          code: row.teacher_code ?? "",
          ...splitName(row.full_name),
        },
        dia: dayName(Number(row.day_of_week)),
        inicio: row.start_time ?? "",
        fin: row.end_time ?? "",
        aula: row.classroom ?? "Por definir",
        zoom: row.meeting_url ?? "",
        // HU18: metadatos de la asesoría (los APKs viejos ignoran estos campos).
        kind: row.kind ?? "recurring",
        fecha: row.session_date ?? null,
        dictanteRol: row.dictante_rol ?? "Profesor",
        asistentes: Number(row.asistentes ?? 0),
        // HU17: confirmación del alumno autenticado.
        myRsvp: row.my_rsvp === true,
      })),
    };
  }

  /**
   * HU17: confirma la asistencia del alumno a una asesoría. Idempotente: repetir
   * la confirmación no duplica el registro (unique en BD). Rechaza con 404 si el
   * alumno no participa de la asesoría (curso/sección que no lleva).
   */
  async confirmRsvp(sessionId: number, studentId: number): Promise<RsvpResult> {
    const allowed = await this.repository.isAdvisingParticipant(sessionId, studentId);
    if (!allowed) {
      throw new HttpError(404, "Asesoría no disponible para tu sección.", "ADVISING_SESSION_NOT_FOUND");
    }
    await this.repository.insertRsvp(sessionId, studentId);
    const asistentes = await this.repository.countRsvp(sessionId);
    return { id: String(sessionId), asistentes, myRsvp: true };
  }

  /** HU17: cancela la asistencia del alumno. Idempotente: cancelar sin confirmación es no-op. */
  async cancelRsvp(sessionId: number, studentId: number): Promise<RsvpResult> {
    await this.repository.deleteRsvp(sessionId, studentId);
    const asistentes = await this.repository.countRsvp(sessionId);
    return { id: String(sessionId), asistentes, myRsvp: false };
  }

  async getContacts(sectionId: number): Promise<ContactsResult> {
    const [teacher, students] = await Promise.all([
      this.repository.findContactTeacherBySectionId(sectionId),
      this.repository.findContactStudentsBySectionId(sectionId),
    ]);

    return {
      docente: teacher ? mapTeacher(teacher) : null,
      alumnos: students.map((row) => {
        const role = contactRole(row.position);
        return {
          user: {
            code: row.code,
            ...splitName(row.full_name),
            email: row.institutional_email,
            role,
            career_id: row.career_id,
            currentCycle: "2026-1",
            setupComplete: true,
          },
          roleInSection: role,
        };
      }),
    };
  }
}
