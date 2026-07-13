import type { db } from "../../db/index.js";
import { sql } from "drizzle-orm";
import type {
  RawAnnouncementRow,
  RawContactStudentRow,
  RawContactTeacherRow,
  RawEnrollmentRow,
  RawSectionRow,
  RawTeacherRow,
} from "./course-detail.types.js";

// Sin catch de rescate: un fallo de BD se propaga (500 real) en vez de simular
// anuncios/contactos vacios con 200. Ver docs/AUDITORIA_TECNICA.md.
export class CourseDetailRepository {
  constructor(readonly database: typeof db) {}

  async findSections(): Promise<RawSectionRow[]> {
    return (await this.database.execute(sql`
      select
        sec.id as section_id,
        sec.code as section_code,
        t.teacher_code,
        c.id as course_id,
        c.name as course_name,
        coalesce(avg(sscore.value), 0) as promedio,
        coalesce(min(e.attended_hours), 0) as attended_hours,
        coalesce(max(e.absent_hours), 0) as absent_hours,
        coalesce(max(e.total_hours), 0) as total_hours
      from section sec
      join teacher t on t.id = sec.teacher_id
      join course_offering co on co.id = sec.course_offering_id
      join course c on c.id = co.course_id
      left join enrollment e on e.section_id = sec.id
      left join student_score sscore on sscore.enrollment_id = e.id
      group by sec.id, sec.code, t.teacher_code, c.id, c.name
      order by c.name, sec.code
    `)) as unknown as RawSectionRow[];
  }

  async findTeachers(): Promise<RawTeacherRow[]> {
    return (await this.database.execute(sql`
      select teacher_code, full_name
      from teacher
      order by full_name
    `)) as unknown as RawTeacherRow[];
  }

  async findEnrollments(): Promise<RawEnrollmentRow[]> {
    return (await this.database.execute(sql`
      select
        e.id,
        au.code as student_code,
        co.course_id,
        e.section_id
      from enrollment e
      join student st on st.id = e.student_id
      join app_user au on au.id = st.user_id
      join section sec on sec.id = e.section_id
      join course_offering co on co.id = sec.course_offering_id
      order by e.section_id, au.code
    `)) as unknown as RawEnrollmentRow[];
  }

  async findAnnouncementsBySectionId(sectionId: number): Promise<RawAnnouncementRow[]> {
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
  }

  async findContactTeacherRowsBySectionId(sectionId: number): Promise<RawContactTeacherRow[]> {
    return (await this.database.execute(sql`
      select
        t.teacher_code,
        t.full_name,
        au.networking_opt_in,
        usl.platform,
        usl.url,
        usl.label
      from section sec
      join teacher t on t.id = sec.teacher_id
      left join app_user au on au.id = t.user_id
      left join user_social_link usl on usl.user_id = au.id
      where sec.id = ${sectionId}
    `)) as unknown as RawContactTeacherRow[];
  }

  async findContactJpRowsBySectionId(sectionId: number): Promise<RawContactTeacherRow[]> {
    return (await this.database.execute(sql`
      select
        t.teacher_code,
        t.full_name,
        au.networking_opt_in,
        usl.platform,
        usl.url,
        usl.label
      from section sec
      join teacher t on t.id = sec.jp_id
      left join app_user au on au.id = t.user_id
      left join user_social_link usl on usl.user_id = au.id
      where sec.id = ${sectionId}
    `)) as unknown as RawContactTeacherRow[];
  }

  async findContactStudentRowsBySectionId(sectionId: number): Promise<RawContactStudentRow[]> {
    return (await this.database.execute(sql`
      select
        e.id as enrollment_id,
        au.code,
        au.full_name,
        au.institutional_email,
        au.networking_opt_in,
        s.career_id,
        sr.position,
        usl.platform,
        usl.url,
        usl.label
      from enrollment e
      join student s on s.id = e.student_id
      join app_user au on au.id = s.user_id
      left join user_social_link usl on usl.user_id = au.id
      left join section_representative sr on sr.enrollment_id = e.id and sr.is_active = true
      where e.section_id = ${sectionId}
      order by au.full_name
    `)) as unknown as RawContactStudentRow[];
  }
}
