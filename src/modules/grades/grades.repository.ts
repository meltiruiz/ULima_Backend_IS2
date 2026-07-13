import { sql } from "drizzle-orm";
import type { db } from "../../db/index.js";
import type { CourseRawRow, StudentScoreRow } from "./grades.types.js";

export class GradesRepository {
  constructor(readonly database: typeof db) {}

  async findCoursesAndAssessments(code?: string): Promise<CourseRawRow[]> {
    const codeFilter = code
      ? sql`
          and exists (
            select 1
            from app_user au
            join student st on st.user_id = au.id
            where au.code = ${code}
              and st.curriculum_id = cc.curriculum_id
          )
        `
      : sql``;

    try {
      return (await this.database.execute(sql`
        select
          c.id as course_id,
          cc.id as curriculum_course_id,
          c.name as course_name,
          ap.code as period_code,
          sec.id as section_id,
          sec.code as section_code,
          sy.drive_file_url as syllabus_url,
          a.id as assessment_id,
          a.name as assessment_name,
          a.code as assessment_code,
          a.weight as assessment_weight,
          at.name as assessment_type
        from course_offering co
        join academic_period ap on ap.id = co.academic_period_id
        join course c on c.id = co.course_id
        left join curriculum_course cc on cc.course_id = c.id
        left join section sec on sec.course_offering_id = co.id
        left join syllabus sy on sy.course_offering_id = co.id
        left join assessment a on a.syllabus_id = sy.id
        left join assessment_type at on at.id = a.assessment_type_id
        where ap.is_active = true
        ${codeFilter}
        order by c.name, sec.code, a.week_number, a.code
      `)) as unknown as CourseRawRow[];
    } catch (e) {
      console.error("DB Error in findCoursesAndAssessments", e);
      return [];
    }
  }

  async findEnrollmentId(studentId: number, sectionId: number): Promise<number | null> {
    try {
      const rows = await this.database.execute(sql`
        select id from enrollment
        where student_id = ${studentId}
          and section_id = ${sectionId}
          and status = 'active'
        limit 1
      `) as unknown as Array<{ id: number }>;
      return rows.length > 0 ? rows[0].id : null;
    } catch (e) {
      console.error("DB Error in findEnrollmentId", e);
      return null;
    }
  }

  async upsertScore(enrollmentId: number, assessmentId: number, value: number | null): Promise<void> {
    try {
      await this.database.execute(sql`
        insert into simulated_grades (enrollment_id, assessment_id, value, updated_at)
        values (${enrollmentId}, ${assessmentId}, ${value}, now())
        on conflict (enrollment_id, assessment_id)
        do update set value = ${value}, updated_at = now()
      `);
    } catch (e) {
      console.error("DB Error in upsertScore", e);
    }
  }

  async deleteScore(enrollmentId: number, assessmentId: number): Promise<void> {
    try {
      await this.database.execute(sql`
        delete from simulated_grades
        where enrollment_id = ${enrollmentId}
          and assessment_id = ${assessmentId}
      `);
    } catch (e) {
      console.error("DB Error in deleteScore", e);
    }
  }

  async findScoresByStudentId(studentId: number): Promise<StudentScoreRow[]> {
    try {
      return (await this.database.execute(sql`
        select
          e.section_id,
          sg.assessment_id,
          sg.value
        from simulated_grades sg
        join enrollment e on e.id = sg.enrollment_id
        where e.student_id = ${studentId}
          and e.status = 'active'
        order by e.section_id, sg.assessment_id
      `)) as unknown as StudentScoreRow[];
    } catch (e) {
      console.error("DB Error in findScoresByStudentId", e);
      return [];
    }
  }
}
