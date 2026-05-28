import { Hono } from "hono";
import type { ScheduleController } from "./schedule.controller";
import { sql } from "drizzle-orm";
import { db } from "../../db";

const dayName = (day: number) => ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][day - 1] ?? "Por definir";

export const createScheduleRoutes = (_controller: ScheduleController) => {
  const app = new Hono();

  app.get("/me/sessions", async (c) => {
    const code = c.req.query("code");
    const rows = await db.execute(sql`
      select
        sec.id as section_id,
        sec.code as section_code,
        t.teacher_code,
        c.id as course_id,
        c.name as course_name,
        e.attended_hours,
        e.absent_hours,
        e.total_hours,
        ss.day_of_week,
        ss.start_time,
        ss.end_time,
        ss.classroom,
        ss.color_hex
      from app_user au
      join student st on st.user_id = au.id
      join enrollment e on e.student_id = st.id
      join section sec on sec.id = e.section_id
      join teacher t on t.id = sec.teacher_id
      join course_offering co on co.id = sec.course_offering_id
      join course c on c.id = co.course_id
      left join schedule_session ss on ss.section_id = sec.id
      where au.code = ${code ?? ""}
        and e.status = 'active'
      order by ss.day_of_week, ss.start_time, c.name
    `) as unknown as Array<{
      section_id: number;
      section_code: string;
      teacher_code: string | null;
      course_id: number;
      course_name: string;
      attended_hours: string;
      absent_hours: string;
      total_hours: string;
      day_of_week: number | null;
      start_time: string | null;
      end_time: string | null;
      classroom: string | null;
      color_hex: string | null;
    }>;

    const sections = new Map<string, any>();
    for (const row of rows) {
      const sectionId = String(row.section_id);
      if (!sections.has(sectionId)) {
        sections.set(sectionId, {
          idSeccion: sectionId,
          codigoSeccion: row.section_code,
          docenteCode: row.teacher_code ?? "",
          promedioSeccion: 0,
          idCurso: String(row.course_id),
          curso: row.course_name,
          asistido: Number(row.attended_hours ?? 0),
          inasistencia: Number(row.absent_hours ?? 0),
          total: Number(row.total_hours ?? 0),
          horarios: [],
        });
      }
      if (row.day_of_week != null) {
        sections.get(sectionId).horarios.push({
          dia: dayName(Number(row.day_of_week)),
          inicio: row.start_time ?? "",
          fin: row.end_time ?? "",
          aula: row.classroom ?? "",
          color: row.color_hex ?? null,
        });
      }
    }

    return c.json({
      days: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
        dayName: dayName(day),
        dateText: "",
        weekText: "Semana actual",
      })),
      secciones: [...sections.values()],
    });
  });

  return app;
};
