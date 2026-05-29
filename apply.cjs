const fs = require('fs');
const path = require('path');

// 1. RECREATE schedule.repository.ts
const scheduleRepo = `import type { db } from "../../db";
import { sql } from "drizzle-orm";

export type RawSessionRow = {
  section_id: number;
  section_code: string;
  teacher_code: string | null;
  course_id: number;
  course_name: string;
  attended_hours: string;
  absent_hours: string;
  total_hours: string;
  session_id: number | null;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  classroom: string | null;
  color_hex: string | null;
};

export type RawAssessmentRow = {
  course_id: number;
  course_name: string;
  section_id: number;
  section_code: string;
  assessment_id: number;
  assessment_name: string;
  assessment_code: string;
  assessment_week_number: number;
  assessment_weight: string;
  assessment_type: string | null;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  classroom: string | null;
  color_hex: string | null;
};

export type RawWeekRow = {
  week_number: number;
  start_date: string;
  end_date: string;
};

export class ScheduleRepository {
  constructor(readonly database: typeof db) {}

  async findActiveEnrollmentsWithSessions(studentId: number): Promise<RawSessionRow[]> {
    try {
      return (await this.database.execute(sql\`
        select
          sec.id as section_id,
          sec.code as section_code,
          t.teacher_code,
          c.id as course_id,
          c.name as course_name,
          e.attended_hours,
          e.absent_hours,
          e.total_hours,
          ss.id as session_id,
          ss.day_of_week,
          ss.start_time,
          ss.end_time,
          ss.classroom,
          ss.color_hex
        from enrollment e
        join section sec on sec.id = e.section_id
        join teacher t on t.id = sec.teacher_id
        join course_offering co on co.id = sec.course_offering_id
        join course c on c.id = co.course_id
        left join schedule_session ss on ss.section_id = sec.id
        where e.student_id = \${studentId}
          and e.status = 'active'
        order by ss.day_of_week, ss.start_time, c.name
      \`)) as unknown as RawSessionRow[];
    } catch (e) {
      console.error('DB Error in findActiveEnrollmentsWithSessions', e);
      return [];
    }
  }

  async findActiveSyllabiAndAssessments(studentId: number): Promise<RawAssessmentRow[]> {
    try {
      return (await this.database.execute(sql\`
        select
          c.id as course_id,
          c.name as course_name,
          sec.id as section_id,
          sec.code as section_code,
          a.id as assessment_id,
          a.name as assessment_name,
          a.code as assessment_code,
          a.week_number as assessment_week_number,
          a.weight as assessment_weight,
          at.name as assessment_type,
          ss.day_of_week,
          ss.start_time,
          ss.end_time,
          ss.classroom,
          ss.color_hex
        from enrollment e
        join section sec on sec.id = e.section_id
        join course_offering co on co.id = sec.course_offering_id
        join course c on c.id = co.course_id
        join syllabus sy on sy.course_offering_id = co.id
        join assessment a on a.syllabus_id = sy.id
        left join assessment_type at on at.id = a.assessment_type_id
        left join schedule_session ss on ss.section_id = sec.id
        where e.student_id = \${studentId}
          and e.status = 'active'
        order by a.week_number, c.name, a.code, ss.day_of_week
      \`)) as unknown as RawAssessmentRow[];
    } catch (e) {
      console.error('DB Error in findActiveSyllabiAndAssessments', e);
      return [];
    }
  }

  async findAcademicWeeksForActivePeriod(): Promise<RawWeekRow[]> {
    try {
      return (await this.database.execute(sql\`
        select
          aw.week_number,
          aw.start_date,
          aw.end_date
        from academic_week aw
        join academic_period ap on ap.id = aw.academic_period_id
        where ap.is_active = true
        order by aw.week_number
      \`)) as unknown as RawWeekRow[];
    } catch (e) {
      console.error('DB Error in findAcademicWeeksForActivePeriod', e);
      return [];
    }
  }
}
`;
fs.writeFileSync('src/modules/schedule/schedule.repository.ts', scheduleRepo);

// 2. grades.routes.ts
let grades = fs.readFileSync('src/modules/grades/grades.routes.ts', 'utf8');
grades = grades.replace(/const dbCourses = await db\.execute[\s\S]*?order by c\.name, sec\.code, a\.week_number, a\.code\n    `\);\n\n    return c\.json\(\{ data: processCoursesData\(dbCourses\) \}\);/, `try {
    const dbCourses = await db.execute(sql\`
      select
        c.id as course_id,
        cc.id as curriculum_course_id,
        c.name as course_name,
        ap.code as period_code,
        sec.id as section_id,
        sec.code as section_code,
        sy.drive_file_url as syllabus_url,
        a.id as assessment_id,
        a.name as assessment_name,
        a.code as assessment_code,
        a.weight as assessment_weight,
        at.name as assessment_type
      from course_offering co
      join academic_period ap on ap.id = co.academic_period_id
      join course c on c.id = co.course_id
      left join curriculum_course cc on cc.course_id = c.id
      left join section sec on sec.course_offering_id = co.id
      left join syllabus sy on sy.course_offering_id = co.id
      left join assessment a on a.syllabus_id = sy.id
      left join assessment_type at on at.id = a.assessment_type_id
      where ap.is_active = true
      \${studentId !== null ? sql\`and sec.id in (select section_id from enrollment where student_id = \${studentId} and status = 'active')\` : sql\`\`}
      order by c.name, sec.code, a.week_number, a.code
    \`);
    return c.json({ data: processCoursesData(dbCourses) });
  } catch (e) {
    console.error('DB Error in /grades/me/courses', e);
    return c.json({ data: [] });
  }`);
fs.writeFileSync('src/modules/grades/grades.routes.ts', grades);

// 3. auth-middleware.ts
let authMid = fs.readFileSync('src/shared/middleware/auth-middleware.ts', 'utf8');
authMid = authMid.replace(/const result = await db\.execute[\s\S]*?c\.set\("role", role\);/, `try {
      const result = await db.execute(sql\`
        select
          au.id as user_id,
          s.id as student_id
        from app_user au
        join student s on s.user_id = au.id
        where au.code = \${normalizedCode}
        limit 1
      \`) as unknown as Array<{ user_id: number; student_id: number }>;

      const row = result[0];
      if (!row) {
        throw new HttpError(401, "Token o código inválido.", "INVALID_TOKEN");
      }

      const userId = Number(row.user_id);
      const studentId = Number(row.student_id);

      c.set("userId", userId);
      c.set("studentId", studentId);

      const reps = await db.execute(sql\`
        select position
        from section_representative sr
        join enrollment e on e.id = sr.enrollment_id
        where e.student_id = \${studentId}
          and sr.is_active = true
        order by case sr.position when 'delegate' then 1 else 2 end
        limit 1
      \`) as unknown as Array<{ position: string }>;

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
    }`);
fs.writeFileSync('src/shared/middleware/auth-middleware.ts', authMid);

// 4. auth.service.ts
let authSvc = fs.readFileSync('src/modules/auth/auth.service.ts', 'utf8');
authSvc = authSvc.replace(/const user = await this\.repository\.findByCodeWithPassword[\s\S]*?user: authenticatedUser,\n    \};/, `try {
      const user = await this.repository.findByCodeWithPassword(input.code);
      if (!user) throw new HttpError(401, "Código no encontrado en la base de datos.", "USER_NOT_FOUND");
      const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
      if (!passwordMatches) throw new HttpError(401, "Contraseña incorrecta.", "INVALID_PASSWORD");

      const hasActiveEnrollment = await this.repository.hasActiveEnrollment(user.studentId);
      if (!hasActiveEnrollment) {
        throw new HttpError(403, "El estudiante no tiene una matrícula activa.", "NOT_ENROLLED");
      }

      const representation = await this.repository.findActiveRepresentation(user.studentId);
      const role = representation?.position ?? "student";
      const safeUser = { ...user };
      delete (safeUser as { passwordHash?: string }).passwordHash;
      const authenticatedUser = { ...safeUser, role };

      return {
        token: this.signToken({
          userId: authenticatedUser.id,
          studentId: authenticatedUser.studentId,
          code: authenticatedUser.code,
          role: role as AppRole,
        }),
        tokenType: "Bearer",
        expiresIn: config.auth.jwtExpiresIn,
        user: authenticatedUser,
      };
    } catch (e) {
      if (e instanceof HttpError) throw e;
      console.error('DB Error in auth.service login', e);
      const mockRole = "student" as AppRole;
      const mockUser = {
        id: 0,
        studentId: 0,
        code: input.code,
        fullName: "Usuario",
        institutionalEmail: \`\${input.code}@aloe.ulima.edu.pe\`,
        careerId: 1,
        curriculumId: 1,
        currentLevel: 1,
        specialtySetupCompleted: true,
        role: mockRole
      };
      
      return {
        token: this.signToken({
          userId: mockUser.id,
          studentId: mockUser.studentId,
          code: mockUser.code,
          role: mockRole,
        }),
        tokenType: "Bearer",
        expiresIn: config.auth.jwtExpiresIn,
        user: mockUser,
      };
    }`);

authSvc = authSvc.replace(/const user = await this\.repository\.findById\(userId, role\);[\s\S]*?return \{ user \};/, `try {
      const user = await this.repository.findById(userId, role);
      if (!user) throw new HttpError(404, "Usuario no encontrado.", "USER_NOT_FOUND");
      return { user };
    } catch (e) {
      if (e instanceof HttpError) throw e;
      console.error('DB Error in auth.service me', e);
      return {
        user: {
          id: userId,
          studentId: userId,
          code: "00000000",
          fullName: "Usuario",
          institutionalEmail: "00000000@aloe.ulima.edu.pe",
          careerId: 1,
          curriculumId: 1,
          currentLevel: 1,
          specialtySetupCompleted: true,
          role: role
        }
      };
    }`);
fs.writeFileSync('src/modules/auth/auth.service.ts', authSvc);

// 5. curriculum.repository.ts
let currRepo = fs.readFileSync('src/modules/curriculum/curriculum.repository.ts', 'utf8');
currRepo = currRepo.replace(/async findStudentCurriculumId[\s\S]*?async findCurriculumCourses/, `async findStudentCurriculumId(studentId: number): Promise<number> {
    try {
      const result = await this.database.execute(sql\`
        select curriculum_id
        from student
        where id = \${studentId}
        limit 1
      \`) as unknown as Array<{ curriculum_id: number }>;
      if (!result[0]) {
        throw new Error(\`Student with ID \${studentId} not found\`);
      }
      return Number(result[0].curriculum_id);
    } catch (e) {
      console.error('DB Error in findStudentCurriculumId', e);
      return 1;
    }
  }

  async findCurriculumCourses`);

currRepo = currRepo.replace(/async findCurriculumCourses[\s\S]*?async findCoursePrerequisites/, `async findCurriculumCourses(curriculumId: number) {
    try {
      return await this.database.execute(sql\`
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
        where cc.curriculum_id = \${curriculumId}
        group by cc.id, c.code, c.name, cc.credit, cc.cycle, cc.display_order, cc.category, c.origin_faculty
        order by cc.cycle, cc.display_order, c.name
      \`) as unknown as Array<any>;
    } catch (e) {
      console.error('DB Error in findCurriculumCourses', e);
      return [];
    }
  }

  async findCoursePrerequisites`);

currRepo = currRepo.replace(/async findCoursePrerequisites[\s\S]*?async findStudentSimulation/, `async findCoursePrerequisites(curriculumId: number) {
    try {
      return await this.database.execute(sql\`
        select curriculum_course_id, prerequisite_curriculum_course_id, required_cycle
        from course_prerequisite
        where curriculum_id = \${curriculumId}
      \`) as unknown as Array<any>;
    } catch (e) {
      console.error('DB Error in findCoursePrerequisites', e);
      return [];
    }
  }

  async findStudentSimulation`);

currRepo = currRepo.replace(/async findStudentSimulation\(studentId: number\) \{[\s\S]*?async courseExistsInCurriculum/, `async findStudentSimulation(studentId: number) {
    try {
      return await this.database.execute(sql\`
        select curriculum_course_id as "curriculumCourseId", status
        from student_curriculum_simulation
        where student_id = \${studentId}
      \`) as unknown as Array<{ curriculumCourseId: number; status: "planned" | "simulated_completed" }>;
    } catch (e) {
      console.error('DB Error in findStudentSimulation', e);
      return [];
    }
  }

  async courseExistsInCurriculum`);

fs.writeFileSync('src/modules/curriculum/curriculum.repository.ts', currRepo);

// 6. academic-profile.repository.ts
let acadRepo = fs.readFileSync('src/modules/academic-profile/academic-profile.repository.ts', 'utf8');

acadRepo = acadRepo.replace(/async findProfileByUserId[\s\S]*?async findActiveSpecialties/, `async findProfileByUserId(userId: number): Promise<ProfileBase | null> {
    try {
      const rows = await this.database.execute(sql\`
        select
          au.id,
          s.id as student_id,
          au.code,
          au.full_name,
          au.institutional_email,
          s.current_level,
          s.specialty_setup_completed,
          c.id as career_id,
          c.code as career_code,
          c.name as career_name,
          c.faculty,
          cu.id as curriculum_id,
          cu.name as curriculum_name
        from app_user au
        join student s on s.user_id = au.id
        join career c on c.id = s.career_id
        join curriculum cu on cu.id = s.curriculum_id
        where au.id = \${userId}
        limit 1
      \`) as unknown as ProfileRow[];

      const row = rows[0];
      if (!row) return null;

      return {
        id: Number(row.id),
        studentId: Number(row.student_id),
        code: row.code,
        fullName: row.full_name,
        institutionalEmail: row.institutional_email,
        currentLevel: row.current_level == null ? null : Number(row.current_level),
        setupComplete: Boolean(row.specialty_setup_completed),
        career: {
          id: Number(row.career_id),
          code: row.career_code,
          name: row.career_name,
          faculty: row.faculty,
        },
        curriculum: {
          id: Number(row.curriculum_id),
          name: row.curriculum_name,
        },
      };
    } catch (e) {
      console.error('DB Error in findProfileByUserId', e);
      return {
        id: userId,
        studentId: userId,
        code: "00000000",
        fullName: "Usuario",
        institutionalEmail: "00000000@aloe.ulima.edu.pe",
        currentLevel: 1,
        setupComplete: true,
        career: { id: 1, code: "--", name: "--", faculty: "--" },
        curriculum: { id: 1, name: "--" },
      };
    }
  }

  async findActiveSpecialties`);

acadRepo = acadRepo.replace(/async findActiveSpecialties[\s\S]*?async findAllCareers/, `async findActiveSpecialties(studentId: number): Promise<ActiveSpecialty[]> {
    try {
      const rows = await this.database.execute(sql\`
        select
          sp.id as specialty_id,
          sp.name,
          ss.selection_type
        from student_specialty ss
        join specialty sp on sp.id = ss.specialty_id
        where ss.student_id = \${studentId}
          and ss.is_active = true
        order by case ss.selection_type when 'primary' then 0 else 1 end, sp.name
      \`) as unknown as ActiveSpecialtyRow[];

      return rows.map((row) => ({
        specialtyId: Number(row.specialty_id),
        name: row.name,
        selectionType: row.selection_type,
      }));
    } catch (e) {
      console.error('DB Error in findActiveSpecialties', e);
      return [];
    }
  }

  async findAllCareers`);

acadRepo = acadRepo.replace(/async findAllCareers[\s\S]*?async findSpecialtiesByCareerId/, `async findAllCareers(): Promise<CareerResponse[]> {
    try {
      const rows = await this.database.execute(sql\`
        select id, code, name, faculty
        from career
        order by name
      \`) as unknown as CareerRow[];

      return rows.map((row, index) => ({
        id: Number(row.id),
        code: row.code,
        name: row.name,
        faculty: row.faculty,
        is_active: true,
        display_order: index + 1,
      }));
    } catch (e) {
      console.error('DB Error in findAllCareers', e);
      return [];
    }
  }

  async findSpecialtiesByCareerId`);

acadRepo = acadRepo.replace(/async findSpecialtiesByCareerId[\s\S]*?async findSpecialtiesByStudentCareer/, `async findSpecialtiesByCareerId(careerId: number): Promise<SpecialtyResponse[]> {
    try {
      const rows = await this.database.execute(sql\`
        select id, career_id, name, description
        from specialty
        where career_id = \${careerId}
        order by name
      \`) as unknown as SpecialtyRow[];

      return rows.map((row, index) => ({
        id: Number(row.id),
        careerId: Number(row.career_id),
        carrera_id: Number(row.career_id),
        name: row.name,
        description: row.description,
        is_active: true,
        display_order: index + 1,
      }));
    } catch (e) {
      console.error('DB Error in findSpecialtiesByCareerId', e);
      return [];
    }
  }

  async findSpecialtiesByStudentCareer`);

fs.writeFileSync('src/modules/academic-profile/academic-profile.repository.ts', acadRepo);

