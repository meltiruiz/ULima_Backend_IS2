import type { NetworkingCard, SocialLink } from "../networking/networking.types.js";
import type {
  AnnouncementResponse,
  ContactsResult,
  EnrollmentResponse,
  RawAnnouncementRow,
  RawContactStudentRow,
  RawContactTeacherRow,
  RawEnrollmentRow,
  RawSectionRow,
  RawTeacherRow,
  SectionResponse,
  TeacherResponse,
} from "./course-detail.types.js";

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

const toNumber = (value: number | string | null) => Number(value ?? 0);

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

type NetworkingRow = {
  networking_opt_in: boolean | null;
  platform: SocialLink["platform"] | null;
  url: string | null;
  label: string | null;
};

const mapNetworkingCard = (rows: NetworkingRow[]): NetworkingCard => ({
  optIn: Boolean(rows[0]?.networking_opt_in),
  links: rows
    .filter((row) => row.platform != null && row.url != null)
    .slice(0, 1)
    .map((row) => ({
      platform: row.platform as SocialLink["platform"],
      url: row.url as string,
      label: row.label ?? null,
    })),
});

export const mapCourseSection = (row: RawSectionRow): SectionResponse => ({
  idSeccion: String(row.section_id),
  codigoSeccion: row.section_code,
  docenteCode: row.teacher_code ?? "",
  promedioSeccion: toNumber(row.promedio),
  idCurso: String(row.course_id),
  curso: row.course_name,
  asistido: toNumber(row.attended_hours),
  inasistencia: toNumber(row.absent_hours),
  total: toNumber(row.total_hours),
});

export const mapCourseTeacher = (row: RawTeacherRow): TeacherResponse => ({
  code: row.teacher_code ?? "",
  ...splitName(row.full_name),
});

export const mapCourseEnrollment = (row: RawEnrollmentRow): EnrollmentResponse => ({
  id: String(row.id),
  studentCode: row.student_code,
  idCurso: String(row.course_id),
  idSeccion: String(row.section_id),
});

export const mapCourseAnnouncement = (
  row: RawAnnouncementRow,
  sectionId: number,
): AnnouncementResponse => ({
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
});

const mapContactTeacher = (rows: RawContactTeacherRow[]): TeacherResponse | null => {
  const row = rows[0];
  if (!row) return null;

  return {
    code: row.teacher_code ?? "",
    ...splitName(row.full_name),
    networking: mapNetworkingCard(rows),
  };
};

export const mapCourseContacts = (
  teacherRows: RawContactTeacherRow[],
  jpRows: RawContactTeacherRow[],
  studentRows: RawContactStudentRow[],
): ContactsResult => {
  const studentsByEnrollment = new Map<number, RawContactStudentRow[]>();

  for (const row of studentRows) {
    const current = studentsByEnrollment.get(row.enrollment_id) ?? [];
    current.push(row);
    studentsByEnrollment.set(row.enrollment_id, current);
  }

  return {
    docente: mapContactTeacher(teacherRows),
    jefePractica: mapContactTeacher(jpRows),
    alumnos: Array.from(studentsByEnrollment.values()).map((rows) => {
      const row = rows[0];
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
        networking: mapNetworkingCard(rows),
      };
    }),
  };
};
