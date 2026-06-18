import type { db } from "../../db/index.js";
import { sql } from "drizzle-orm";
import type { AppRole, AuthCurrentCourse, AuthSpecialty, AuthUser, AuthUserWithPassword } from "./auth.types.js";

type UserRow = {
  id: number;
  code: string;
  full_name: string;
  institutional_email: string;
  password_hash?: string;
  token_version: number;
  student_id: number;
  career_id: number;
  curriculum_id: number;
  current_level: number | null;
  specialty_setup_completed: boolean;
};

type SpecialtyRow = {
  specialty_id: number;
  name: string;
  selection_type: "primary" | "interest";
};

type CurrentCourseRow = {
  section_id: number;
  section_code: string;
  curriculum_course_id: number | null;
  course_id: number;
  course_name: string;
  period_code: string | null;
};

const splitName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts.length > 1 ? parts.slice(0, -1).join(" ") : fullName,
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  };
};

const approvedLevelsFor = (currentLevel: number | null) => {
  if (currentLevel == null || currentLevel <= 1) return [];
  return Array.from({ length: currentLevel - 1 }, (_, index) => index + 1);
};

const mapRole = (position?: "delegate" | "subdelegate" | null): AppRole => {
  if (position === "delegate" || position === "subdelegate") return position;
  return "student";
};

export class AuthRepository {
  constructor(readonly database: typeof db) {}

  async incrementTokenVersion(userId: number): Promise<number> {
    const rows = await this.database.execute(sql`
      update app_user
      set token_version = token_version + 1
      where id = ${userId}
      returning token_version
    `) as unknown as Array<{ token_version: number }>;

    return Number(rows[0]?.token_version ?? 1);
  }

  /** Vincula (guarda) el ID único de Google (`sub`) del usuario al autenticarse
   *  con Google SSO. Idempotente: solo escribe si cambió. */
  async linkGoogleId(userId: number, googleId: string): Promise<void> {
    await this.database.execute(sql`
      update app_user
      set google_id = ${googleId}
      where id = ${userId}
        and (google_id is null or google_id <> ${googleId})
    `);
  }

  async findByCodeWithPassword(code: string): Promise<AuthUserWithPassword | null> {
    const rows = await this.database.execute(sql`
      select
        au.id,
        au.code,
        au.full_name,
        au.institutional_email,
        au.password_hash,
        au.token_version,
        s.id as student_id,
        s.career_id,
        s.curriculum_id,
        s.current_level,
        s.specialty_setup_completed
      from app_user au
      join student s on s.user_id = au.id
      where au.code = ${code.trim()}
      limit 1
    `) as unknown as UserRow[];

    const row = rows[0];
    if (!row || !row.password_hash) return null;

    const user = await this.buildUser(row, "student");
    return {
      ...user,
      passwordHash: row.password_hash,
    };
  }

  async findByEmail(institutionalEmail: string): Promise<AuthUser | null> {
    const rows = await this.database.execute(sql`
      select
        au.id,
        au.code,
        au.full_name,
        au.institutional_email,
        au.token_version,
        s.id as student_id,
        s.career_id,
        s.curriculum_id,
        s.current_level,
        s.specialty_setup_completed
      from app_user au
      join student s on s.user_id = au.id
      where au.institutional_email = ${institutionalEmail.trim()}
      limit 1
    `) as unknown as UserRow[];

    const row = rows[0];
    if (!row) return null;

    const user = await this.buildUser(row, "student");
    return user;
  }

  async findById(userId: number, role: AppRole): Promise<AuthUser | null> {
    const rows = await this.database.execute(sql`
      select
        au.id,
        au.code,
        au.full_name,
        au.institutional_email,
        au.token_version,
        s.id as student_id,
        s.career_id,
        s.curriculum_id,
        s.current_level,
        s.specialty_setup_completed
      from app_user au
      join student s on s.user_id = au.id
      where au.id = ${userId}
      limit 1
    `) as unknown as UserRow[];

    const row = rows[0];
    return row ? this.buildUser(row, role) : null;
  }

  async hasActiveEnrollment(studentId: number): Promise<boolean> {
    const rows = await this.database.execute(sql`
      select 1
      from enrollment
      where student_id = ${studentId}
        and status = 'active'
      limit 1
    `) as unknown as Array<{ "?column?": number }>;

    return rows.length > 0;
  }

  async findActiveRepresentation(studentId: number): Promise<{ position: AppRole } | null> {
    const rows = await this.database.execute(sql`
      select sr.position
      from section_representative sr
      join enrollment e on e.id = sr.enrollment_id
      where e.student_id = ${studentId}
        and e.status = 'active'
        and sr.is_active = true
      order by case sr.position when 'delegate' then 0 when 'subdelegate' then 1 else 2 end
      limit 1
    `) as unknown as Array<{ position: "delegate" | "subdelegate" | null }>;

    const role = mapRole(rows[0]?.position);
    return role === "student" ? null : { position: role };
  }

  private async buildUser(row: UserRow, role: AppRole): Promise<AuthUser> {
    const [specialties, currentCourses] = await Promise.all([
      this.findActiveSpecialties(Number(row.student_id)),
      this.findCurrentCourses(Number(row.student_id), Number(row.curriculum_id)),
    ]);

    const primary = specialties.find((specialty) => specialty.selectionType === "primary")?.specialtyId ?? null;
    const interest = specialties
      .filter((specialty) => specialty.selectionType === "interest")
      .map((specialty) => specialty.specialtyId);
    const combined = [
      ...(primary == null ? [] : [primary]),
      ...interest.filter((id) => id !== primary),
    ];
    const names = splitName(row.full_name);
    const currentLevel = row.current_level == null ? null : Number(row.current_level);

    return {
      id: Number(row.id),
      studentId: Number(row.student_id),
      code: row.code,
      tokenVersion: Number(row.token_version),
      fullName: row.full_name,
      ...names,
      institutionalEmail: row.institutional_email,
      email: row.institutional_email,
      role,
      careerId: Number(row.career_id),
      career_id: Number(row.career_id),
      curriculumId: Number(row.curriculum_id),
      currentLevel,
      currentCycle: currentCourses[0]?.period_code ?? "2026-1",
      setupComplete: Boolean(row.specialty_setup_completed),
      specialtySetupCompleted: Boolean(row.specialty_setup_completed),
      especialidad_principal: primary,
      especialidades_interes: interest,
      especialidades: combined,
      specialties,
      courseProgress: {
        approvedLevels: approvedLevelsFor(currentLevel),
        approvedElectives: [],
        currentCourses,
      },
    };
  }

  private async findActiveSpecialties(studentId: number): Promise<AuthSpecialty[]> {
    const rows = await this.database.execute(sql`
      select
        sp.id as specialty_id,
        sp.name,
        ss.selection_type
      from student_specialty ss
      join specialty sp on sp.id = ss.specialty_id
      where ss.student_id = ${studentId}
        and ss.is_active = true
      order by case ss.selection_type when 'primary' then 0 else 1 end, sp.name
    `) as unknown as SpecialtyRow[];

    return rows.map((row) => ({
      specialtyId: Number(row.specialty_id),
      name: row.name,
      selectionType: row.selection_type,
    }));
  }

  private async findCurrentCourses(studentId: number, curriculumId: number): Promise<AuthCurrentCourse[]> {
    const rows = await this.database.execute(sql`
      select
        sec.id as section_id,
        sec.code as section_code,
        cc.id as curriculum_course_id,
        c.id as course_id,
        c.name as course_name,
        ap.code as period_code
      from enrollment e
      join section sec on sec.id = e.section_id
      join course_offering co on co.id = sec.course_offering_id
      join academic_period ap on ap.id = co.academic_period_id
      join course c on c.id = co.course_id
      left join curriculum_course cc on cc.course_id = c.id and cc.curriculum_id = ${curriculumId}
      where e.student_id = ${studentId}
        and e.status = 'active'
      order by c.name, sec.code
    `) as unknown as CurrentCourseRow[];

    return rows.map((course) => ({
      idSeccion: String(course.section_id),
      codigoSeccion: course.section_code,
      idCurso: String(course.curriculum_course_id ?? course.course_id),
      courseId: String(course.curriculum_course_id ?? course.course_id),
      nombre: course.course_name,
      period_code: course.period_code,
    }));
  }
}
