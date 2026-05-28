import type { EventBus } from "../../events";
import type { AuthRepository } from "./auth.repository";
import { sql } from "drizzle-orm";
import { HttpError } from "../../shared/errors/http-error";

export class AuthService {
  constructor(
    readonly repository: AuthRepository,
    readonly events: EventBus,
  ) {}

  async login(input: { code: string; password: string }) {
    const user = await this.findUserByCode(input.code);
    if (!user) throw new HttpError(401, "Código no encontrado en la base de datos.", "USER_NOT_FOUND");
    return {
      token: `dev-${user.code}`,
      tokenType: "Bearer",
      expiresIn: 86400,
      user,
    };
  }

  async me(code: string) {
    const user = await this.findUserByCode(code);
    if (!user) throw new HttpError(404, "Usuario no encontrado.", "USER_NOT_FOUND");
    return { user };
  }

  private async findUserByCode(code: string) {
    const normalizedCode = code.trim();
    const result = await this.repository.database.execute(sql`
      select
        au.id as id,
        au.code,
        au.full_name,
        au.institutional_email,
        s.id as student_id,
        s.career_id,
        s.curriculum_id,
        s.current_level
      from app_user au
      join student s on s.user_id = au.id
      where au.code = ${normalizedCode}
      limit 1
    `) as unknown as Array<{
      id: number;
      code: string;
      full_name: string;
      institutional_email: string;
      student_id: number;
      career_id: number;
      curriculum_id: number;
      current_level: number | null;
    }>;

    const row = result[0];
    if (!row) return null;

    const currentCourses = await this.repository.database.execute(sql`
      select
        sec.id as section_id,
        sec.code as section_code,
        c.id as course_id,
        c.name as course_name
      from enrollment e
      join section sec on sec.id = e.section_id
      join course_offering co on co.id = sec.course_offering_id
      join course c on c.id = co.course_id
      where e.student_id = ${row.student_id}
        and e.status = 'active'
      order by c.name, sec.code
    `) as unknown as Array<{
      section_id: number;
      section_code: string;
      course_id: number;
      course_name: string;
    }>;

    const nameParts = row.full_name.trim().split(/\s+/);
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : row.full_name;
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

    return {
      id: Number(row.id),
      studentId: Number(row.student_id),
      code: row.code,
      fullName: row.full_name,
      firstName,
      lastName,
      institutionalEmail: row.institutional_email,
      email: row.institutional_email,
      role: "estudiante",
      careerId: Number(row.career_id),
      career_id: Number(row.career_id),
      curriculumId: Number(row.curriculum_id),
      currentLevel: row.current_level == null ? null : Number(row.current_level),
      currentCycle: "2026-1",
      setupComplete: true,
      especialidad_principal: null,
      especialidades_interes: [],
      especialidades: [],
      courseProgress: {
        approvedLevels: [],
        approvedElectives: [],
        currentCourses: currentCourses.map((course) => ({
          idSeccion: String(course.section_id),
          codigoSeccion: course.section_code,
          idCurso: String(course.course_id),
          courseId: String(course.course_id),
          nombre: course.course_name,
        })),
      },
    };
  }
}
