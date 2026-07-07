import { Hono } from "hono";
import type { CourseDetailController } from "./course-detail.controller.js";
import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { authMiddleware, requireRole, STUDENT_ROLES } from "../../shared/middleware/auth-middleware.js";

const dayName = (day: number) => ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][day - 1] ?? "Por definir";
const splitName = (fullName: string) => {
  if (fullName.includes(",")) {
    const parts = fullName.split(",");
    return {
      lastName: parts[0].trim(),
      firstName: parts.slice(1).join(",").trim(),
    };
  }
  
  const parts = fullName.trim().split(/\s+/);
  if (parts.length > 2) {
    return {
      lastName: parts.slice(0, 2).join(" "),
      firstName: parts.slice(2).join(" "),
    };
  } else if (parts.length === 2) {
    return {
      lastName: parts[0],
      firstName: parts[1],
    };
  }
  
  return {
    firstName: fullName,
    lastName: "",
  };
};

export const createCourseDetailRoutes = (_controller: CourseDetailController) => {
  const app = new Hono();

  // Todas las rutas de detalle de curso exponen datos académicos sensibles
  // (secciones, docentes, matrículas, contactos): requieren JWT válido de alumno.
  app.use("*", authMiddleware);
  app.use("*", requireRole(...STUDENT_ROLES));

  app.get("/sections", async (c) => {
    try {
      const rows = await db.execute(sql`
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
      `) as unknown as Array<any>;

      return c.json({
        secciones: rows.map((row) => ({
          idSeccion: String(row.section_id),
          codigoSeccion: row.section_code,
          docenteCode: row.teacher_code ?? "",
          promedioSeccion: Number(row.promedio ?? 0),
          idCurso: String(row.course_id),
          curso: row.course_name,
          asistido: Number(row.attended_hours ?? 0),
          inasistencia: Number(row.absent_hours ?? 0),
          total: Number(row.total_hours ?? 0),
        })),
      });
    } catch (e) {
      console.error("DB Error in /sections", e);
      return c.json({ secciones: [] });
    }
  });

  app.get("/teachers", async (c) => {
    try {
      const rows = await db.execute(sql`
        select teacher_code, full_name
        from teacher
        order by full_name
      `) as unknown as Array<{ teacher_code: string | null; full_name: string }>;

      return c.json({
        docentes: rows.map((row) => ({
          code: row.teacher_code ?? "",
          ...splitName(row.full_name),
        })),
      });
    } catch (e) {
      console.error("DB Error in /teachers", e);
      return c.json({ docentes: [] });
    }
  });

  app.get("/enrollments", async (c) => {
    try {
      const rows = await db.execute(sql`
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
      `) as unknown as Array<any>;

      return c.json({
        enrollments: rows.map((row) => ({
          id: String(row.id),
          studentCode: row.student_code,
          idCurso: String(row.course_id),
          idSeccion: String(row.section_id),
        })),
      });
    } catch (e) {
      console.error("DB Error in /enrollments", e);
      return c.json({ enrollments: [] });
    }
  });

  app.get("/sections/:sectionId", async (c) => {
    const sectionId = c.req.param("sectionId");
    // Reenvía el Authorization para que la sub-petición interna pase authMiddleware.
    const response = await app.request("/sections", {
      headers: { Authorization: c.req.header("Authorization") ?? "" },
    });
    const data = await response.json() as { secciones: any[] };
    return c.json({ section: data.secciones.find((section) => section.idSeccion === sectionId) ?? null });
  });

  app.get("/sections/:sectionId/announcements", async (c) => {
    const sectionId = Number(c.req.param("sectionId"));
    try {
      const rows = await db.execute(sql`
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
      `) as unknown as Array<any>;

      return c.json({
        anuncios: rows.map((row) => ({
          id: String(row.id),
          idSeccion: String(sectionId),
          titulo: row.title,
          mensaje: row.message,
          fecha: row.published_at?.toISOString?.() ?? String(row.published_at ?? ""),
          autorCode: row.autor_code,
          autor: {
            code: row.autor_code,
            ...splitName(row.full_name),
            email: row.institutional_email,
            role: row.position === 'delegate' ? 'DELEGADO' : row.position === 'subdelegate' ? 'SUBDELEGADO' : 'estudiante',
            career_id: null,
            currentCycle: "2026-1",
            setupComplete: true,
          },
        })),
      });
    } catch (e) {
      console.error(`DB Error in /sections/${sectionId}/announcements`, e);
      return c.json({ anuncios: [] });
    }
  });

  app.get("/sections/:sectionId/advising", async (c) => {
    const sectionId = Number(c.req.param("sectionId"));
    try {
      const rows = await db.execute(sql`
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
          (select count(*)::int from advising_rsvp r where r.advising_session_id = cas.id) as asistentes
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
      `) as unknown as Array<any>;

      return c.json({
        asesorias: rows.map((row) => ({
          id: String(row.id),
          courseId: String(row.course_offering_id),
          docenteCode: row.teacher_code ?? "",
          docente: {
            code: row.teacher_code ?? "",
            ...splitName(row.full_name),
          },
          dia: dayName(Number(row.day_of_week)),
          inicio: row.start_time ?? "",
          fin: row.end_time ?? "",
          aula: row.classroom ?? "Por definir",
          zoom: row.meeting_url ?? "",
          // HU18: nuevos campos (los previos no cambian → APKs viejos siguen funcionando).
          kind: row.kind ?? "recurring",
          fecha: row.session_date ?? null,
          dictanteRol: row.dictante_rol ?? "Profesor",
          asistentes: Number(row.asistentes ?? 0),
        })),
      });
    } catch (e) {
      console.error(`DB Error in /sections/${sectionId}/advising`, e);
      return c.json({ asesorias: [] });
    }
  });

  app.get("/sections/:sectionId/contacts", async (c) => {
    const sectionId = Number(c.req.param("sectionId"));
    try {
      const teacherRows = await db.execute(sql`
        select t.teacher_code, t.full_name
        from section sec
        join teacher t on t.id = sec.teacher_id
        where sec.id = ${sectionId}
        limit 1
      `) as unknown as Array<any>;
      // HU18: jefe de práctica de la sección (0 o 1).
      const jpRows = await db.execute(sql`
        select t.teacher_code, t.full_name
        from section sec
        join teacher t on t.id = sec.jp_id
        where sec.id = ${sectionId}
        limit 1
      `) as unknown as Array<any>;
      const rows = await db.execute(sql`
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
      `) as unknown as Array<any>;

      return c.json({
        docente: teacherRows[0]
          ? {
              code: teacherRows[0].teacher_code ?? "",
              ...splitName(teacherRows[0].full_name),
            }
          : null,
        // HU18: grupo "Jefe de Práctica" (entre Docente y Alumnos). null si la sección no tiene JP.
        jefePractica: jpRows[0]
          ? {
              code: jpRows[0].teacher_code ?? "",
              ...splitName(jpRows[0].full_name),
            }
          : null,
        alumnos: rows.map((row) => ({
          user: {
            code: row.code,
            ...splitName(row.full_name),
            email: row.institutional_email,
            role: row.position === "delegate" ? "delegado" : row.position === "subdelegate" ? "subdelegado" : "estudiante",
            career_id: row.career_id,
            currentCycle: "2026-1",
            setupComplete: true,
          },
          roleInSection: row.position === "delegate" ? "delegado" : row.position === "subdelegate" ? "subdelegado" : "estudiante",
        })),
      });
    } catch (e) {
      console.error(`DB Error in /sections/${sectionId}/contacts`, e);
      return c.json({ docente: null, alumnos: [] });
    }
  });

  return app;
};
