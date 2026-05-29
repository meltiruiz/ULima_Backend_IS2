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
        cc.id as curriculum_course_id,
        c.id as course_id,
        c.name as course_name
      from enrollment e
      join section sec on sec.id = e.section_id
      join course_offering co on co.id = sec.course_offering_id
      join course c on c.id = co.course_id
      left join curriculum_course cc on cc.course_id = c.id and cc.curriculum_id = ${row.curriculum_id}
      where e.student_id = ${row.student_id}
        and e.status = 'active'
      order by c.name, sec.code
    `) as unknown as Array<{
      section_id: number;
      section_code: string;
      curriculum_course_id: number | null;
      course_id: number;
      course_name: string;
    }>;

    const nameParts = row.full_name.trim().split(/\s+/);
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : row.full_name;
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

    // Query active specialties
    const specialties = await this.repository.database.execute(sql`
      select
        sp.id as "specialtyId",
        sp.name,
        ss.selection_type as "selectionType"
      from student_specialty ss
      join specialty sp on sp.id = ss.specialty_id
      where ss.student_id = ${row.student_id}
        and ss.is_active = true
    `) as unknown as Array<{ specialtyId: number; name: string; selectionType: "primary" | "interest" }>;

    const principalSpecialty = specialties.find(s => s.selectionType === "primary");
    const interestSpecialties = specialties.filter(s => s.selectionType === "interest").map(s => Number(s.specialtyId));

    const especialidadPrincipal = principalSpecialty ? Number(principalSpecialty.specialtyId) : null;
    const especialidadesInteres = interestSpecialties;
    const especialidades = [
      ...(especialidadPrincipal ? [especialidadPrincipal] : []),
      ...especialidadesInteres,
    ];

    // Query real course progress (approved levels and approved electives)
    const allCurriculumCourses = await this.repository.database.execute(sql`
      select id, cycle as level, category
      from curriculum_course
      where curriculum_id = ${row.curriculum_id}
    `) as unknown as Array<{ id: number; level: number; category: string }>;

    const approvedCourses = await this.repository.database.execute(sql`
      select curriculum_course_id
      from student_course_progress
      where student_id = ${row.student_id}
        and status = 'approved'
    `) as unknown as Array<{ curriculum_course_id: number }>;

    const approvedSet = new Set(approvedCourses.map(c => Number(c.curriculum_course_id)));

    // Calculate approved electives
    const approvedElectives = allCurriculumCourses
      .filter(c => c.category === "elective" && approvedSet.has(Number(c.id)))
      .map(c => String(c.id));

    // Calculate approved levels (cycles where all mandatory courses are approved)
    const coursesByLevel = new Map<number, { totalMandatory: number; approvedMandatory: number }>();
    for (const c of allCurriculumCourses) {
      if (c.category === "elective") continue; // electives do not complete cycles
      const lvl = Number(c.level);
      const stats = coursesByLevel.get(lvl) ?? { totalMandatory: 0, approvedMandatory: 0 };
      stats.totalMandatory++;
      if (approvedSet.has(Number(c.id))) {
        stats.approvedMandatory++;
      }
      coursesByLevel.set(lvl, stats);
    }

    const approvedLevels: number[] = [];
    for (const [lvl, stats] of coursesByLevel.entries()) {
      if (stats.totalMandatory > 0 && stats.totalMandatory === stats.approvedMandatory) {
        approvedLevels.push(lvl);
      }
    }

    // Check if they are a representative to determine effective role
    const reps = await this.repository.database.execute(sql`
      select position
      from section_representative sr
      join enrollment e on e.id = sr.enrollment_id
      where e.student_id = ${row.student_id}
        and sr.is_active = true
      order by case sr.position when 'delegate' then 1 else 2 end
      limit 1
    `) as unknown as Array<{ position: string }>;

    let role = "estudiante";
    if (reps[0]) {
      role = reps[0].position === "delegate" ? "delegado" : "subdelegado";
    }

    return {
      id: Number(row.id),
      studentId: Number(row.student_id),
      code: row.code,
      fullName: row.full_name,
      firstName,
      lastName,
      institutionalEmail: row.institutional_email,
      email: row.institutional_email,
      role: role,
      careerId: Number(row.career_id),
      career_id: Number(row.career_id),
      curriculumId: Number(row.curriculum_id),
      currentLevel: row.current_level == null ? null : Number(row.current_level),
      currentCycle: "2026-1",
      setupComplete: row.current_level !== null,
      especialidad_principal: especialidadPrincipal,
      especialidades_interes: especialidadesInteres,
      especialidades: especialidades,
      courseProgress: {
        approvedLevels: approvedLevels,
        approvedElectives: approvedElectives,
        currentCourses: currentCourses.map((course) => ({
          idSeccion: String(course.section_id),
          codigoSeccion: course.section_code,
          idCurso: String(course.curriculum_course_id ?? course.course_id),
          courseId: String(course.curriculum_course_id ?? course.course_id),
          nombre: course.course_name,
        })),
      },
    };
  }
}
