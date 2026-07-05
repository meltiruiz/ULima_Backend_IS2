import { Hono } from "hono";
import type { CourseDetailController } from "./course-detail.controller.js";
import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";

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

export const createCourseDetailRoutes = (controller: CourseDetailController) => {
  const app = new Hono();

  // Todas las rutas de detalle de curso exponen datos académicos sensibles
  // (secciones, docentes, matrículas, contactos): requieren JWT válido.
  app.use("*", authMiddleware);

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

  app.get("/sections/:sectionId/announcements", (c) => controller.getAnnouncements(c));

  app.get("/sections/:sectionId/advising", (c) => controller.getAdvising(c));

  app.get("/sections/:sectionId/contacts", (c) => controller.getContacts(c));

  return app;
};
