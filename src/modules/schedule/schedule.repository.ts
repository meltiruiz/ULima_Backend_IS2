import type { db } from "../../db";
import { sql } from "drizzle-orm";

export type RawSessionRow = {
  section_id: number;
  section_code: string;
  teacher_code: string | null;
  course_id: number;
  course_name: string;
  attended_hours: string;
  absent_hours: string;
  total_hours: string;
  session_id: number | null;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  classroom: string | null;
  color_hex: string | null;
};

export type RawAssessmentRow = {
  course_id: number;
  course_name: string;
  section_id: number;
  section_code: string;
  assessment_id: number;
  assessment_name: string;
  assessment_code: string;
  assessment_week_number: number;
  assessment_weight: string;
  assessment_type: string | null;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  classroom: string | null;
  color_hex: string | null;
};

export type RawWeekRow = {
  week_number: number;
  start_date: string;
  end_date: string;
};

export class ScheduleRepository {
  constructor(readonly database: typeof db) {}

  async findActiveEnrollmentsWithSessions(studentId: number): Promise<RawSessionRow[]> {
    try {
      return (await this.database.execute(sql`
        select
          sec.id as section_id,
          sec.code as section_code,
          t.teacher_code,
          c.id as course_id,
          c.name as course_name,
          e.attended_hours,
          e.absent_hours,
          e.total_hours,
          ss.id as session_id,
          ss.day_of_week,
          ss.start_time,
          ss.end_time,
          ss.classroom,
          ss.color_hex
        from enrollment e
        join section sec on sec.id = e.section_id
        join teacher t on t.id = sec.teacher_id
        join course_offering co on co.id = sec.course_offering_id
        join course c on c.id = co.course_id
        left join schedule_session ss on ss.section_id = sec.id
        where e.student_id = ${studentId}
          and e.status = 'active'
        order by ss.day_of_week, ss.start_time, c.name
      `)) as unknown as RawSessionRow[];
    } catch (e) {
      console.error('DB Error in findActiveEnrollmentsWithSessions', e);
      return [];
    }
  }

  async findActiveSyllabiAndAssessments(studentId: number): Promise<RawAssessmentRow[]> {
    try {
      return (await this.database.execute(sql`
        select
          c.id as course_id,
          c.name as course_name,
          sec.id as section_id,
          sec.code as section_code,
          a.id as assessment_id,
          a.name as assessment_name,
          a.code as assessment_code,
          a.week_number as assessment_week_number,
          a.weight as assessment_weight,
          at.name as assessment_type,
          ss.day_of_week,
          ss.start_time,
          ss.end_time,
          ss.classroom,
          ss.color_hex
        from enrollment e
        join section sec on sec.id = e.section_id
        join course_offering co on co.id = sec.course_offering_id
        join course c on c.id = co.course_id
        join syllabus sy on sy.course_offering_id = co.id
        join assessment a on a.syllabus_id = sy.id
        left join assessment_type at on at.id = a.assessment_type_id
        left join schedule_session ss on ss.section_id = sec.id
        where e.student_id = ${studentId}
          and e.status = 'active'
        order by a.week_number, c.name, a.code, ss.day_of_week
      `)) as unknown as RawAssessmentRow[];
    } catch (e) {
      console.error('DB Error in findActiveSyllabiAndAssessments', e);
      return [];
    }
  }

  async findAcademicWeeksForActivePeriod(): Promise<RawWeekRow[]> {
    try {
      return (await this.database.execute(sql`
        select
          aw.week_number,
          aw.start_date,
          aw.end_date
        from academic_week aw
        join academic_period ap on ap.id = aw.academic_period_id
        where ap.is_active = true
        order by aw.week_number
      `)) as unknown as RawWeekRow[];
    } catch (e) {
      console.error('DB Error in findAcademicWeeksForActivePeriod', e);
      return [];
    }
  }
}
