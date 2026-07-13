import type { NetworkingCard, SocialLink } from "../networking/networking.types.js";

export type CourseDetailTab = "announcements" | "advising" | "contacts";

export type RawSectionRow = {
  section_id: number;
  section_code: string;
  teacher_code: string | null;
  course_id: number;
  course_name: string;
  promedio: number | string | null;
  attended_hours: number | string | null;
  absent_hours: number | string | null;
  total_hours: number | string | null;
};

export type SectionResponse = {
  idSeccion: string;
  codigoSeccion: string;
  docenteCode: string;
  promedioSeccion: number;
  idCurso: string;
  curso: string;
  asistido: number;
  inasistencia: number;
  total: number;
};

export type SectionsResult = {
  secciones: SectionResponse[];
};

export type SectionResult = {
  section: SectionResponse | null;
};

export type RawTeacherRow = {
  teacher_code: string | null;
  full_name: string;
};

export type TeachersResult = {
  docentes: TeacherResponse[];
};

export type RawEnrollmentRow = {
  id: number;
  student_code: string;
  course_id: number;
  section_id: number;
};

export type EnrollmentResponse = {
  id: string;
  studentCode: string;
  idCurso: string;
  idSeccion: string;
};

export type EnrollmentsResult = {
  enrollments: EnrollmentResponse[];
};

export type RawAnnouncementRow = {
  id: number;
  title: string;
  message: string;
  published_at: Date | string | null;
  autor_code: string;
  full_name: string;
  institutional_email: string;
  position: string;
};

export type AnnouncementAuthorResponse = {
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  career_id: null;
  currentCycle: string;
  setupComplete: true;
};

export type AnnouncementResponse = {
  id: string;
  idSeccion: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  autorCode: string;
  autor: AnnouncementAuthorResponse;
};

export type AnnouncementsResult = {
  anuncios: AnnouncementResponse[];
};

export type TeacherResponse = {
  code: string;
  firstName: string;
  lastName: string;
  networking?: NetworkingCard;
};

export type RawContactTeacherRow = {
  teacher_code: string | null;
  full_name: string;
  networking_opt_in: boolean | null;
  platform: SocialLink["platform"] | null;
  url: string | null;
  label: string | null;
};

export type RawContactStudentRow = {
  enrollment_id: number;
  code: string;
  full_name: string;
  institutional_email: string;
  networking_opt_in: boolean | null;
  career_id: number | null;
  position: string | null;
  platform: SocialLink["platform"] | null;
  url: string | null;
  label: string | null;
};

export type ContactUserResponse = {
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  career_id: number | null;
  currentCycle: string;
  setupComplete: true;
};

export type ContactStudentResponse = {
  user: ContactUserResponse;
  roleInSection: string;
  networking: NetworkingCard;
};

export type ContactsResult = {
  docente: TeacherResponse | null;
  jefePractica: TeacherResponse | null;
  alumnos: ContactStudentResponse[];
};
