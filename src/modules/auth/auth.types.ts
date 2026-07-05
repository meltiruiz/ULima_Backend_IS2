export type AppRole =
  | "student"
  | "delegate"
  | "subdelegate";

export type AuthSpecialty = {
  specialtyId: number;
  name: string;
  selectionType: "primary" | "interest";
};

export type AuthCurrentCourse = {
  idSeccion: string;
  codigoSeccion: string;
  idCurso: string;
  courseId: string;
  nombre: string;
  period_code?: string | null;
};

export type AuthUser = {
  id: number;
  studentId: number;
  code: string;
  tokenVersion: number;
  fullName: string;
  firstName: string;
  lastName: string;
  institutionalEmail: string;
  email: string;
  role: AppRole;
  careerId: number;
  career_id: number;
  curriculumId: number;
  currentLevel: number | null;
  currentCycle: string;
  setupComplete: boolean;
  specialtySetupCompleted: boolean;
  especialidad_principal: number | null;
  especialidades_interes: number[];
  especialidades: number[];
  specialties: AuthSpecialty[];
  courseProgress: {
    approvedLevels: number[];
    approvedElectives: string[];
    currentCourses: AuthCurrentCourse[];
  };
};

export type AuthUserWithPassword = AuthUser & {
  passwordHash: string;
};

/** Datos mínimos del usuario para el flujo de restablecimiento de contraseña. */
export type PasswordResetUser = {
  id: number;
  institutionalEmail: string;
};

/** Estado persistido de un token de restablecimiento (fila de `password_reset_token`). */
export type PasswordResetTokenRecord = {
  id: number;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  attempts: number;
};
