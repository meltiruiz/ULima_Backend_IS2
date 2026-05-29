import type { db } from "../../db";
import { sql } from "drizzle-orm";

export class AcademicProfileRepository {
  constructor(readonly database: typeof db) {}

  async findProfileByUserId(userId: number) {
    const result = await this.database.execute(sql`
      select
        au.id as user_id,
        s.id as student_id,
        au.code,
        au.full_name as "fullName",
        au.institutional_email as "institutionalEmail",
        s.current_level as "currentLevel",
        c.id as career_id,
        c.code as career_code,
        c.name as career_name,
        c.faculty as career_faculty,
        curr.id as curriculum_id,
        curr.name as curriculum_name
      from app_user au
      join student s on s.user_id = au.id
      join career c on c.id = s.career_id
      join curriculum curr on curr.id = s.curriculum_id
      where au.id = ${userId}
      limit 1
    `) as unknown as Array<any>;

    return result[0] || null;
  }

  async findActiveSpecialties(studentId: number) {
    return await this.database.execute(sql`
      select
        sp.id as "specialtyId",
        sp.name,
        ss.selection_type as "selectionType"
      from student_specialty ss
      join specialty sp on sp.id = ss.specialty_id
      where ss.student_id = ${studentId}
        and ss.is_active = true
    `) as unknown as Array<{ specialtyId: number; name: string; selectionType: "primary" | "interest" }>;
  }

  async findAllCareers() {
    return await this.database.execute(sql`
      select id, code, name, faculty
      from career
      order by name
    `) as unknown as Array<{ id: number; code: string; name: string; faculty: string }>;
  }

  async findSpecialtiesByCareerId(careerId: number) {
    return await this.database.execute(sql`
      select id, career_id as "careerId", name, description
      from specialty
      where career_id = ${careerId}
      order by name
    `) as unknown as Array<{ id: number; careerId: number; name: string; description: string | null }>;
  }

  async specialtyExists(specialtyId: number): Promise<boolean> {
    const result = await this.database.execute(sql`
      select 1 from specialty where id = ${specialtyId} limit 1
    `) as unknown as Array<any>;
    return result.length > 0;
  }

  async deactivateAllStudentSpecialties(studentId: number) {
    await this.database.execute(sql`
      update student_specialty
      set is_active = false
      where student_id = ${studentId}
    `);
  }

  async upsertStudentSpecialty(studentId: number, specialtyId: number, selectionType: "primary" | "interest") {
    await this.database.execute(sql`
      insert into student_specialty (student_id, specialty_id, selection_type, is_active)
      values (${studentId}, ${specialtyId}, ${selectionType}, true)
      on conflict (student_id, specialty_id)
      do update set selection_type = excluded.selection_type, is_active = true
    `);
  }
}
