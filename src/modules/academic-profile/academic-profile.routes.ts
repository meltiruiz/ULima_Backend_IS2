import { Hono } from "hono";
import type { AcademicProfileController } from "./academic-profile.controller";
import { sql } from "drizzle-orm";
import { db } from "../../db";

export const createAcademicProfileRoutes = (_controller: AcademicProfileController) => {
  const app = new Hono();

  app.get("/careers", async (c) => {
    const careers = await db.execute(sql`
      select id, code, name, faculty
      from career
      order by name
    `) as unknown as Array<Record<string, unknown>>;

    return c.json({
      careers: careers.map((career, index) => ({
        ...career,
        is_active: true,
        display_order: index + 1,
      })),
    });
  });

  app.get("/specialties", async (c) => {
    const careerId = c.req.query("careerId");
    const specialties = await db.execute(
      careerId
        ? sql`
            select id, career_id, name, description
            from specialty
            where career_id = ${Number(careerId)}
            order by name
          `
        : sql`
            select id, career_id, name, description
            from specialty
            order by career_id, name
          `,
    ) as unknown as Array<Record<string, unknown>>;

    return c.json({
      specialties: specialties.map((specialty, index) => ({
        ...specialty,
        carrera_id: specialty.career_id,
        is_active: true,
        display_order: index + 1,
      })),
    });
  });

  app.get("/users", async (c) => {
    const rows = await db.execute(sql`
      select
        au.code,
        au.full_name,
        au.institutional_email,
        s.career_id,
        s.current_level
      from app_user au
      join student s on s.user_id = au.id
      order by au.full_name
    `) as unknown as Array<{
      code: string;
      full_name: string;
      institutional_email: string;
      career_id: number;
      current_level: number | null;
    }>;

    return c.json({
      users: rows.map((row) => {
        const parts = row.full_name.trim().split(/\s+/);
        return {
          code: row.code,
          firstName: parts.length > 1 ? parts.slice(0, -1).join(" ") : row.full_name,
          lastName: parts.length > 1 ? parts[parts.length - 1] : "",
          email: row.institutional_email,
          role: "estudiante",
          career_id: row.career_id,
          currentCycle: "2026-1",
          setupComplete: true,
          courseProgress: {
            approvedLevels: [],
            approvedElectives: [],
            currentCourses: [],
          },
        };
      }),
    });
  });

  return app;
};
