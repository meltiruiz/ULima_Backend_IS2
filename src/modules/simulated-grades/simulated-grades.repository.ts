import type { db } from "../../db/index.js";
import { sql } from "drizzle-orm";

export class SimulatedGradesRepository {
  constructor(readonly database: typeof db) {}

  // Lista las notas simuladas del alumno (join a su matrícula/sección).
  async findByStudent(studentId: number) {
    return await this.database.execute(sql`
      select
        sg.assessment_id as "assessmentId",
        sec.id as "sectionId",
        sg.value as "value"
      from simulated_grades sg
      join enrollment e on e.id = sg.enrollment_id
      join section sec on sec.id = e.section_id
      where e.student_id = ${studentId}
      order by sec.id, sg.assessment_id
    `) as unknown as Array<{ assessmentId: number; sectionId: number; value: string }>;
  }

  // Resuelve la matrícula del alumno para una evaluación dada. La evaluación
  // pertenece a un sílabo -> oferta de curso; el alumno tiene UNA matrícula en
  // una sección de esa oferta. Devuelve null si la evaluación no corresponde a
  // ningún curso en el que el alumno esté matriculado (evita escrituras ajenas).
  async findEnrollmentForAssessment(studentId: number, assessmentId: number): Promise<number | null> {
    const rows = await this.database.execute(sql`
      select e.id as "enrollmentId"
      from assessment a
      join syllabus sy on sy.id = a.syllabus_id
      join course_offering co on co.id = sy.course_offering_id
      join section sec on sec.course_offering_id = co.id
      join enrollment e on e.section_id = sec.id and e.student_id = ${studentId}
      where a.id = ${assessmentId}
      limit 1
    `) as unknown as Array<{ enrollmentId: number }>;
    return rows[0] ? Number(rows[0].enrollmentId) : null;
  }

  async upsert(enrollmentId: number, assessmentId: number, value: number) {
    await this.database.execute(sql`
      insert into simulated_grades (enrollment_id, assessment_id, value, updated_at)
      values (${enrollmentId}, ${assessmentId}, ${value}, now())
      on conflict (enrollment_id, assessment_id)
      do update set value = excluded.value, updated_at = now()
    `);
  }

  // Borra la nota simulada del alumno para una evaluación. Filtra por
  // student_id para no permitir borrar filas de otro alumno.
  async deleteByStudentAndAssessment(studentId: number, assessmentId: number): Promise<number> {
    const rows = await this.database.execute(sql`
      delete from simulated_grades sg
      using enrollment e
      where sg.enrollment_id = e.id
        and e.student_id = ${studentId}
        and sg.assessment_id = ${assessmentId}
      returning sg.id
    `) as unknown as Array<{ id: number }>;
    return rows.length;
  }
}
