import { Hono } from "hono";
import type { SectionManagementController } from "./section-management.controller";
import { sql } from "drizzle-orm";
import { db } from "../../db";

export const createSectionManagementRoutes = (_controller: SectionManagementController) => {
  const app = new Hono();

  app.get("/representatives", async (c) => {
    const rows = await db.execute(sql`
      select
        sr.id,
        sr.enrollment_id,
        sr.position,
        sr.section_id
      from section_representative sr
      where sr.is_active = true
      order by sr.section_id, sr.position
    `) as unknown as Array<{
      id: number;
      enrollment_id: number;
      position: string;
      section_id: number;
    }>;

    return c.json({
      sectionRepresentatives: rows.map((row) => ({
        id: String(row.id),
        enrollmentId: String(row.enrollment_id),
        idSeccion: String(row.section_id),
        role: row.position === "delegate" ? "delegado" : row.position === "subdelegate" ? "subdelegado" : row.position,
      })),
    });
  });

  return app;
};
