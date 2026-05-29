import { Hono } from "hono";
import type { GradesController } from "./grades.controller";
import { sql } from "drizzle-orm";
import { db } from "../../db";

export const createGradesRoutes = (_controller: GradesController) => {
  const app = new Hono();

  app.get("/me/courses", async (c) => {
    const code = c.req.query("code");
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

    const rows = await db.execute(sql`
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
    `) as unknown as Array<{
      course_id: number;
      curriculum_course_id: number | null;
      course_name: string;
      period_code: string;
      section_id: number | null;
      section_code: string | null;
      assessment_id: number | null;
      assessment_name: string | null;
      assessment_code: string | null;
      syllabus_url: string | null;
      assessment_weight: string | null;
      assessment_type: string | null;
    }>;

    const courses = new Map<string, any>();
    const syllabi = new Map<string, any>();

    for (const row of rows) {
      const courseId = String(row.curriculum_course_id ?? row.course_id);
      if (!courses.has(courseId)) {
        courses.set(courseId, {
          id: courseId,
          nombre: row.course_name,
          ciclo: row.period_code,
          silaboUrl: row.syllabus_url ?? null,
          secciones: [],
        });
      }

      if (row.section_id != null) {
        const sectionId = String(row.section_id);
        const course = courses.get(courseId);
        if (!course.secciones.some((s: any) => s.idSeccion === sectionId)) {
          course.secciones.push({
            idSeccion: sectionId,
            codigoSeccion: row.section_code ?? "",
          });
        }

        if (!syllabi.has(sectionId)) {
          syllabi.set(sectionId, {
            cursoId: sectionId,
            cursoNombre: row.course_name,
            evaluaciones: [],
          });
        }

        if (row.assessment_id != null) {
          const syllabus = syllabi.get(sectionId);
          if (!syllabus.evaluaciones.some((e: any) => e.id === String(row.assessment_id))) {
            syllabus.evaluaciones.push({
              id: String(row.assessment_id),
              nombre: row.assessment_name ?? row.assessment_code ?? "",
              sigla: row.assessment_code ?? "",
              peso: Number(row.assessment_weight ?? 0),
              tipo: row.assessment_type ?? "",
            });
          }
        }
      }
    }

    return c.json({ cursos: [...courses.values()], syllabi: [...syllabi.values()] });
  });

  return app;
};
