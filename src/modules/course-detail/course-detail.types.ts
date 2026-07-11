export type CourseDetailTab = "announcements" | "advising" | "contacts";

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

export type RawAdvisingRow = {
  id: number;
  course_offering_id: number;
  section_id: number | null;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  classroom: string | null;
  meeting_url: string | null;
  teacher_code: string | null;
  full_name: string;
  // HU18: metadatos de la asesoría (recurrente vs extra) y conteo de asistentes.
  kind: string | null;
  session_date: string | null;
  dictante_rol: string | null;
  asistentes: number | null;
  // HU17: ¿el alumno autenticado ya confirmó su asistencia? (false si es docente).
  my_rsvp: boolean | null;
};

export type TeacherResponse = {
  code: string;
  firstName: string;
  lastName: string;
};

export type AdvisingResponse = {
  id: string;
  courseId: string;
  docenteCode: string;
  docente: TeacherResponse;
  dia: string;
  inicio: string;
  fin: string;
  aula: string;
  zoom: string;
  // HU18: metadatos de la asesoría.
  kind: string;
  fecha: string | null;
  dictanteRol: string;
  asistentes: number;
  // HU17: confirmación de asistencia del alumno autenticado.
  myRsvp: boolean;
};

export type AdvisingResult = {
  asesorias: AdvisingResponse[];
};

// HU17: resultado de confirmar/cancelar asistencia a una asesoría.
export type RsvpResult = {
  id: string;
  asistentes: number;
  myRsvp: boolean;
};

export type RawContactTeacherRow = {
  teacher_code: string | null;
  full_name: string;
};

export type RawContactStudentRow = {
  enrollment_id: number;
  code: string;
  full_name: string;
  institutional_email: string;
  career_id: number | null;
  position: string | null;
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
};

export type ContactsResult = {
  docente: TeacherResponse | null;
  alumnos: ContactStudentResponse[];
};
