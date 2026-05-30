import type { MiddlewareHandler } from "hono";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { config } from "../../config/app-config.js";
import { HttpError } from "../errors/http-error.js";

export type AuthVariables = {
  userId: number;
  studentId: number;
  role: string;
};

const isPayload = (payload: string | JwtPayload): payload is JwtPayload =>
  typeof payload !== "string";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const auth = c.req.header("Authorization");
  const bearerCode = auth?.startsWith("Bearer dev-") ? auth.slice("Bearer dev-".length) : null;
  const code = c.req.query("code") ?? c.req.header("X-User-Code") ?? bearerCode;

  if (code) {
    const normalizedCode = code.trim();

    // Query database to find the user and student by code
    try {
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
    } catch (e) {
      if (e instanceof HttpError) throw e;
      console.error('DB Error in authMiddleware', e);
      c.set("userId", 0);
      c.set("studentId", 0);
      c.set("role", "estudiante");
    }
  } else {
    if (!auth) {
      throw new HttpError(401, "No se envió token de autenticación.", "MISSING_TOKEN");
    }

    const [type, token] = auth.split(" ");
    if (type !== "Bearer" || !token) {
      throw new HttpError(401, "Token de autenticación inválido.", "INVALID_TOKEN");
    }

    try {
      const payload = jwt.verify(token, config.auth.jwtSecret);
      if (!isPayload(payload)) {
        throw new HttpError(401, "Token de autenticación inválido.", "INVALID_TOKEN");
      }

      const userId = Number(payload.sub);
      const studentId = Number(payload.studentId);
      const role = payload.role;
      if (!Number.isInteger(userId) || !Number.isInteger(studentId) || typeof role !== "string") {
        throw new HttpError(401, "Token de autenticación inválido.", "INVALID_TOKEN");
      }

      c.set("userId", userId);
      c.set("studentId", studentId);
      c.set("role", role);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(401, "Token de autenticación inválido o expirado.", "INVALID_TOKEN");
    }
  }

  await next();
};
