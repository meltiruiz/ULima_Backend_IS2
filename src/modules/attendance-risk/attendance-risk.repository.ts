import type { db } from "../../db/index.js";
import { sql } from "drizzle-orm";
import type { AttendanceRiskRawRow, StudentNotifyRow } from "./attendance-risk.types.js";

export class AttendanceRiskRepository {
  constructor(readonly database: typeof db) {}

  async findStudentsBySectionId(sectionId: number): Promise<AttendanceRiskRawRow[]> {
    try {
      return (await this.database.execute(sql`
        SELECT
          au.code,
          au.full_name,
          s.current_level,
          e.absent_hours,
          COALESCE(co.total_hours, e.total_hours) as total_section_hours,
          cc.cycle
        FROM enrollment e
        JOIN student s ON s.id = e.student_id
        JOIN app_user au ON au.id = s.user_id
        JOIN section sec ON sec.id = e.section_id
        JOIN course_offering co ON co.id = sec.course_offering_id
        JOIN course c ON c.id = co.course_id
        JOIN curriculum_course cc ON cc.course_id = c.id AND cc.curriculum_id = s.curriculum_id
        WHERE e.section_id = ${sectionId}
          AND e.status = 'active'
        ORDER BY au.full_name
      `)) as unknown as AttendanceRiskRawRow[];
    } catch (e) {
      console.error(`DB Error in findStudentsBySectionId(${sectionId})`, e);
      return [];
    }
  }

  async findStudentDetailsBySectionId(sectionId: number): Promise<StudentNotifyRow[]> {
    try {
      return (await this.database.execute(sql`
        SELECT
          s.id as student_id,
          au.code,
          au.full_name,
          s.current_level,
          e.absent_hours,
          COALESCE(co.total_hours, e.total_hours) as total_section_hours,
          c.name as course_name,
          sec.code as section_code,
          cc.cycle
        FROM enrollment e
        JOIN student s ON s.id = e.student_id
        JOIN app_user au ON au.id = s.user_id
        JOIN section sec ON sec.id = e.section_id
        JOIN course_offering co ON co.id = sec.course_offering_id
        JOIN course c ON c.id = co.course_id
        JOIN curriculum_course cc ON cc.course_id = c.id AND cc.curriculum_id = s.curriculum_id
        WHERE e.section_id = ${sectionId}
          AND e.status = 'active'
        ORDER BY au.full_name
      `)) as unknown as StudentNotifyRow[];
    } catch (e) {
      console.error(`DB Error in findStudentDetailsBySectionId(${sectionId})`, e);
      return [];
    }
  }

  async createAlerts(data: { studentId: number; type: string; title: string; message: string }[]): Promise<number> {
    let count = 0;
    for (const d of data) {
      try {
        await this.database.execute(sql`
          INSERT INTO alert (student_id, type, title, message)
          VALUES (${d.studentId}, ${d.type}, ${d.title}, ${d.message})
        `);
        count++;
      } catch (e) {
        console.error(`Error creating alert for student ${d.studentId}:`, e);
      }
    }
    return count;
  }
}
