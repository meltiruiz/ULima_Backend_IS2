import type { db } from "../../db/index.js";
import { sql } from "drizzle-orm";
import type {
  RawAdvisingRow,
  RawAnnouncementRow,
  RawContactStudentRow,
  RawContactTeacherRow,
} from "./course-detail.types.js";

export class CourseDetailRepository {
  constructor(readonly database: typeof db) {}

  async findAnnouncementsBySectionId(sectionId: number): Promise<RawAnnouncementRow[]> {
    try {
      return (await this.database.execute(sql`
        select
          a.id,
          a.title,
          a.message,
          a.published_at,
          au.code as autor_code,
          au.full_name,
          au.institutional_email,
          sr.position
        from announcement a
        join section_representative sr on sr.id = a.section_representative_id
        join enrollment e on e.id = sr.enrollment_id
        join student st on st.id = e.student_id
        join app_user au on au.id = st.user_id
        where sr.section_id = ${sectionId}
          and a.is_active = true
        order by a.published_at desc
      `)) as unknown as RawAnnouncementRow[];
    } catch (e) {
      console.error(`DB Error in findAnnouncementsBySectionId(${sectionId})`, e);
      return [];
    }
  }

  async findAdvisingBySectionId(sectionId: number, studentId?: number): Promise<RawAdvisingRow[]> {
    // HU17: si hay un alumno autenticado, marcamos las asesorías que ya confirmó.
    // Con un docente (o sin studentId) `my_rsvp` es siempre false.
    const myRsvpExpr = studentId != null
      ? sql`exists(select 1 from advising_rsvp r where r.advising_session_id = cas.id and r.student_id = ${studentId})`
      : sql`false`;
    try {
      return (await this.database.execute(sql`
        select
          cas.id,
          cas.course_offering_id,
          cas.section_id,
          cas.day_of_week,
          cas.start_time,
          cas.end_time,
          cas.classroom,
          cas.meeting_url,
          cas.kind,
          cas.session_date::text as session_date,
          t.teacher_code,
          t.full_name,
          -- HU18: etiqueta del dictante según sea el titular o el JP de la sección.
          case when cas.teacher_id = sec.jp_id then 'JP' else 'Profesor' end as dictante_rol,
          (select count(*)::int from advising_rsvp r where r.advising_session_id = cas.id) as asistentes,
          ${myRsvpExpr} as my_rsvp
        from course_advising_session cas
        join teacher t on t.id = cas.teacher_id
        join section sec on sec.course_offering_id = cas.course_offering_id
        where sec.id = ${sectionId}
          and (cas.section_id is null or cas.section_id = ${sectionId})
          -- No listar extras cuya fecha ya pasó.
          and (cas.kind = 'recurring' or cas.session_date >= current_date)
        order by
          case when cas.kind = 'extra' then 0 else 1 end,
          cas.session_date nulls last, cas.day_of_week, cas.start_time
      `)) as unknown as RawAdvisingRow[];
    } catch (e) {
      console.error(`DB Error in findAdvisingBySectionId(${sectionId})`, e);
      return [];
    }
  }

  // ─── HU17: RSVP del alumno a asesorías ──────────────────────────────────────

  /**
   * ¿El alumno puede confirmar asistencia a esta asesoría? Solo si tiene una
   * matrícula activa en una sección que puede ver la asesoría (mismo course
   * offering; y, si la asesoría fija `section_id`, esa sección). Evita que un
   * alumno infle el conteo de una asesoría de un curso que no lleva.
   */
  async isAdvisingParticipant(sessionId: number, studentId: number): Promise<boolean> {
    const rows = (await this.database.execute(sql`
      select 1
      from course_advising_session cas
      join section sec on sec.course_offering_id = cas.course_offering_id
      join enrollment e on e.section_id = sec.id and e.status = 'active'
      where cas.id = ${sessionId}
        and e.student_id = ${studentId}
        and (cas.section_id is null or cas.section_id = sec.id)
      limit 1
    `)) as unknown as Array<unknown>;
    return rows.length > 0;
  }

  /** Inserta el RSVP de forma idempotente (unique advising_session_id+student_id). */
  async insertRsvp(sessionId: number, studentId: number): Promise<void> {
    await this.database.execute(sql`
      insert into advising_rsvp (advising_session_id, student_id)
      values (${sessionId}, ${studentId})
      on conflict (advising_session_id, student_id) do nothing
    `);
  }

  /** Borra el RSVP del alumno (idempotente: borrar lo inexistente es no-op). */
  async deleteRsvp(sessionId: number, studentId: number): Promise<void> {
    await this.database.execute(sql`
      delete from advising_rsvp
      where advising_session_id = ${sessionId} and student_id = ${studentId}
    `);
  }

  /** Conteo actual de confirmados de una asesoría. */
  async countRsvp(sessionId: number): Promise<number> {
    const rows = (await this.database.execute(sql`
      select count(*)::int as total
      from advising_rsvp
      where advising_session_id = ${sessionId}
    `)) as unknown as Array<{ total: number }>;
    return Number(rows[0]?.total ?? 0);
  }

  async findContactTeacherBySectionId(sectionId: number): Promise<RawContactTeacherRow | null> {
    try {
      const rows = (await this.database.execute(sql`
        select t.teacher_code, t.full_name
        from section sec
        join teacher t on t.id = sec.teacher_id
        where sec.id = ${sectionId}
        limit 1
      `)) as unknown as RawContactTeacherRow[];

      return rows[0] ?? null;
    } catch (e) {
      console.error(`DB Error in findContactTeacherBySectionId(${sectionId})`, e);
      return null;
    }
  }

  async findContactStudentsBySectionId(sectionId: number): Promise<RawContactStudentRow[]> {
    try {
      return (await this.database.execute(sql`
        select
          e.id as enrollment_id,
          au.code,
          au.full_name,
          au.institutional_email,
          s.career_id,
          sr.position
        from enrollment e
        join student s on s.id = e.student_id
        join app_user au on au.id = s.user_id
        left join section_representative sr on sr.enrollment_id = e.id and sr.is_active = true
        where e.section_id = ${sectionId}
        order by au.full_name
      `)) as unknown as RawContactStudentRow[];
    } catch (e) {
      console.error(`DB Error in findContactStudentsBySectionId(${sectionId})`, e);
      return [];
    }
  }
}
