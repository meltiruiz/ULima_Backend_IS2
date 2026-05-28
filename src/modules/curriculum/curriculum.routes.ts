import { Hono } from "hono";
import type { CurriculumController } from "./curriculum.controller";
import { sql } from "drizzle-orm";
import { db } from "../../db";

const curriculumIdForCode = async (code?: string) => {
  if (code) {
    const rows = await db.execute(sql`
      select s.curriculum_id
      from student s
      join app_user au on au.id = s.user_id
      where au.code = ${code}
      limit 1
    `) as unknown as Array<{ curriculum_id: number }>;
    if (rows[0]) return Number(rows[0].curriculum_id);
  }

  const rows = await db.execute(sql`
    select id as curriculum_id
    from curriculum
    order by id
    limit 1
  `) as unknown as Array<{ curriculum_id: number }>;
  return Number(rows[0]?.curriculum_id ?? 1);
};

export const createCurriculumRoutes = (_controller: CurriculumController) => {
  const app = new Hono();

  app.get("/me", async (c) => {
    const curriculumId = await curriculumIdForCode(c.req.query("code"));
    const courses = await db.execute(sql`
      select
        cc.id,
        c.code,
        c.name,
        cc.credit as credits,
        cc.cycle as level,
        cc.display_order - 1 as row,
        case cc.category
          when 'general_studies' then 'EEGG'
          when 'common' then 'COMMON'
          when 'elective' then 'ELECTIVE'
          else 'FACULTY'
        end as category,
        c.origin_faculty as external_faculty,
        coalesce(array_agg(distinct sp.name) filter (where sp.id is not null), '{}') as specialties
      from curriculum_course cc
      join course c on c.id = cc.course_id
      left join curriculum_course_specialty ccs on ccs.curriculum_course_id = cc.id
      left join specialty sp on sp.id = ccs.specialty_id
      where cc.curriculum_id = ${curriculumId}
      group by cc.id, c.code, c.name, cc.credit, cc.cycle, cc.display_order, cc.category, c.origin_faculty
      order by cc.cycle, cc.display_order, c.name
    `) as unknown as Array<{
      id: number;
      code: string;
      name: string;
      credits: number;
      level: number;
      row: number;
      category: string;
      external_faculty: string | null;
      specialties: string[] | null;
    }>;

    const prerequisites = await db.execute(sql`
      select curriculum_course_id, prerequisite_curriculum_course_id, required_cycle
      from course_prerequisite
      where curriculum_id = ${curriculumId}
    `) as unknown as Array<{
      curriculum_course_id: number;
      prerequisite_curriculum_course_id: number | null;
      required_cycle: number | null;
    }>;

    const byCourse = new Map<number, string[]>();
    for (const prerequisite of prerequisites) {
      const list = byCourse.get(Number(prerequisite.curriculum_course_id)) ?? [];
      if (prerequisite.prerequisite_curriculum_course_id != null) {
        list.push(String(prerequisite.prerequisite_curriculum_course_id));
      } else if (Number(prerequisite.required_cycle) === 5) {
        list.push("_V_CICLO_");
      } else if (Number(prerequisite.required_cycle) === 6) {
        list.push("_VI_CICLO_");
      }
      byCourse.set(Number(prerequisite.curriculum_course_id), list);
    }

    const mappedCourses = courses.map((course) => ({
      id: String(course.id),
      code: course.code,
      name: course.name,
      credits: Number(course.credits),
      level: Number(course.level),
      row: Number(course.row),
      category: course.category,
      prerequisites: byCourse.get(Number(course.id)) ?? [],
      specialties: course.specialties ?? [],
      externalFaculty: course.external_faculty,
    }));

    return c.json({
      courses: mappedCourses,
      specialties: [...new Set(mappedCourses.flatMap((course) => course.specialties))],
    });
  });

  return app;
};
