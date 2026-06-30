import type { db } from "../../db";
import { sql } from "drizzle-orm";

export interface EnrollmentWithScore {
  enrollment_id: number;
  course_id: number;
  course_name: string;
  assessment_id: number | null;
  assessment_weight: string | null;
  score_value: string | null;
}

export interface StoredAlert {
  id: number;
  studentId: number;
  type: "academic_risk" | "high_load";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export class AlertsRepository {
  constructor(readonly database: typeof db) {}

  async getActiveEnrollmentsWithScores(studentId: number): Promise<EnrollmentWithScore[]> {
    return (await this.database.execute(sql`
      select
        e.id as enrollment_id,
        c.id as course_id,
        c.name as course_name,
        a.id as assessment_id,
        a.weight as assessment_weight,
        ss.value as score_value
      from enrollment e
      join section sec on sec.id = e.section_id
      join course_offering co on co.id = sec.course_offering_id
      join course c on c.id = co.course_id
      left join syllabus sy on sy.course_offering_id = co.id
      left join assessment a on a.syllabus_id = sy.id
      left join student_score ss on ss.assessment_id = a.id and ss.enrollment_id = e.id
      where e.student_id = ${studentId}
        and e.status = 'active'
    `)) as unknown as EnrollmentWithScore[];
  }

  async getHighLoadWeeks(studentId: number): Promise<Array<{ week_number: number; assessment_count: number }>> {
    return (await this.database.execute(sql`
      select
        a.week_number,
        count(a.id) as assessment_count
      from enrollment e
      join section sec on sec.id = e.section_id
      join course_offering co on co.id = sec.course_offering_id
      join syllabus sy on sy.course_offering_id = co.id
      join assessment a on a.syllabus_id = sy.id
      where e.student_id = ${studentId}
        and e.status = 'active'
      group by a.week_number
      having count(a.id) >= 3
    `)) as unknown as Array<{ week_number: number; assessment_count: number }>;
  }

  async getAlerts(studentId: number): Promise<StoredAlert[]> {
    const rows = await this.database.execute(sql`
      select 
        id, 
        student_id as "studentId", 
        type, 
        title, 
        message, 
        is_read as "isRead", 
        created_at as "createdAt"
      from alert
      where student_id = ${studentId}
      order by created_at desc
    `) as unknown as any[];

    return rows.map(r => ({
      id: Number(r.id),
      studentId: Number(r.studentId),
      type: r.type as "academic_risk" | "high_load",
      title: String(r.title),
      message: String(r.message),
      isRead: Boolean(r.isRead),
      createdAt: new Date(r.createdAt),
    }));
  }

  async findAlertByTitle(studentId: number, title: string): Promise<boolean> {
    const rows = await this.database.execute(sql`
      select id
      from alert
      where student_id = ${studentId}
        and title = ${title}
      limit 1
    `) as unknown as any[];
    return rows.length > 0;
  }

  async createAlert(studentId: number, type: "academic_risk" | "high_load", title: string, message: string): Promise<void> {
    await this.database.execute(sql`
      insert into alert (student_id, type, title, message, is_read, created_at)
      values (${studentId}, ${type}, ${title}, ${message}, false, now())
    `);
  }

  async markAlertAsRead(studentId: number, alertId: number): Promise<boolean> {
    const result = await this.database.execute(sql`
      update alert
      set is_read = true
      where id = ${alertId}
        and student_id = ${studentId}
      returning id
    `) as unknown as any[];
    return result.length > 0;
  }
}

