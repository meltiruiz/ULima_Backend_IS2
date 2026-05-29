import type { MiddlewareHandler } from "hono";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { HttpError } from "../errors/http-error";

export type AuthVariables = {
  userId: number;
  studentId: number;
  role: string;
};

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const auth = c.req.header("Authorization");
  const bearerCode = auth?.startsWith("Bearer dev-") ? auth.slice("Bearer dev-".length) : null;
  const code = c.req.query("code") ?? c.req.header("X-User-Code") ?? bearerCode;

  if (!code) {
    throw new HttpError(401, "No autorizado. Token o código faltante.", "MISSING_TOKEN");
  }

  const normalizedCode = code.trim();

  // Query database to find the user and student by code
  const result = await db.execute(sql`
    select
      au.id as user_id,
      s.id as student_id
    from app_user au
    join student s on s.user_id = au.id
    where au.code = ${normalizedCode}
    limit 1
  `) as unknown as Array<{ user_id: number; student_id: number }>;

  const row = result[0];
  if (!row) {
    throw new HttpError(401, "Token o código inválido.", "INVALID_TOKEN");
  }

  const userId = Number(row.user_id);
  const studentId = Number(row.student_id);

  c.set("userId", userId);
  c.set("studentId", studentId);

  // Check if they are a representative to determine effective role
  const reps = await db.execute(sql`
    select position
    from section_representative sr
    join enrollment e on e.id = sr.enrollment_id
    where e.student_id = ${studentId}
      and sr.is_active = true
    order by case sr.position when 'delegate' then 1 else 2 end
    limit 1
  `) as unknown as Array<{ position: string }>;

  let role = "estudiante";
  if (reps[0]) {
    role = reps[0].position === "delegate" ? "delegado" : "subdelegado";
  }

  c.set("role", role);

  await next();
};

