import {
  pgTable,
  pgEnum,
  integer,
  varchar,
  boolean,
  timestamp,
  text,
  unique,
  primaryKey,
  uniqueIndex,
  index,
  date,
  decimal,
  time
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* =========================
   ENUMS
========================= */

export const courseStatusEnum = pgEnum("course_status", [
  "locked",
  "available",
  "enrolled",
  "passed"
]);

export const representativePositionEnum = pgEnum("representative_position", [
  "delegate",
  "subdelegate"
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "active",
  "withdrawn",
  "completed"
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "justified"
]);

export const alertTypeEnum = pgEnum("alert_type", [
  "academic_risk",
  "high_load",
  "grade_reminder",
  "course_average",
  "system"
]);

export const syllabusStatusEnum = pgEnum("syllabus_status", [
  "active",
  "archived"
]);

export const advisingModalityEnum = pgEnum("advising_modality", [
  "classroom",
  "virtual",
  "hybrid"
]);

export const classSessionStatusEnum = pgEnum("class_session_status", [
  "scheduled",
  "completed",
  "cancelled",
  "rescheduled"
]);

export const courseCategoryEnum = pgEnum("course_category", [
  "general_studies",
  "common",
  "faculty",
  "elective"
]);

export const prerequisiteTypeEnum = pgEnum("prerequisite_type", [
  "course",
  "completed_cycle"
]);

/* =========================
   USUARIOS
========================= */

export const appUser = pgTable("app_user", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  fullName: varchar("full_name", { length: 150 }).notNull(),
  institutionalEmail: varchar("institutional_email", { length: 150 }).notNull().unique(),
  phone: varchar("phone", { length: 30 }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const student = pgTable("student", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => appUser.id),
  careerId: integer("career_id").notNull().references(() => career.id),
  curriculumId: integer("curriculum_id").notNull().references(() => curriculum.id),
  currentCycle: integer("current_cycle"),
  specialtySelectedAt: timestamp("specialty_selected_at", { mode: "date" }),
}, (t) => ({
  idxStudentUserId: index("idx_student_user_id").on(t.userId),
}));

export const teacher = pgTable("teacher", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  teacherCode: varchar("teacher_code", { length: 50 }).unique(),
  fullName: varchar("full_name", { length: 150 }).notNull(),
  institutionalEmail: varchar("institutional_email", { length: 150 }).unique(),
  phone: varchar("phone", { length: 30 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/* =========================
   ESCTRUCTURA ACADÉMICA
========================= */

export const career = pgTable("career", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  faculty: varchar("faculty", { length: 120 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const specialty = pgTable("specialty", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  careerId: integer("career_id").notNull().references(() => career.id),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => ({
  uqSpecialtyCareerName: unique("uq_specialty_career_name").on(t.careerId, t.name),
}));

export const studentSpecialty = pgTable("student_specialty", {
  studentId: integer("student_id").notNull().references(() => student.id),
  specialtyId: integer("specialty_id").notNull().references(() => specialty.id),
  selectedAt: timestamp("selected_at", { mode: "date" }).notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => ({
  pk: primaryKey({ columns: [t.studentId, t.specialtyId] }),
  idxStudentSpecialtyStudent: index("idx_student_specialty_student").on(t.studentId),
}));

export const studyPlan = pgTable("study_plan", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  careerId: integer("career_id").notNull().references(() => career.id),
  name: varchar("name", { length: 120 }).notNull(),
  startYear: integer("start_year"),
  isActive: boolean("is_active").notNull().default(true),
});

export const curriculum = pgTable("curriculum", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  studyPlanId: integer("study_plan_id").notNull().references(() => studyPlan.id),
  name: varchar("name", { length: 120 }).notNull(),
  version: varchar("version", { length: 30 }).notNull(),
  fileUrl: varchar("file_url", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => ({
  uqCurriculumPlanVersion: unique("uq_curriculum_plan_version").on(t.studyPlanId, t.version),
}));

export const course = pgTable("course", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  defaultCredit: integer("default_credit").notNull(),
  originFaculty: varchar("origin_faculty", { length: 120 }),
  isActive: boolean("is_active").notNull().default(true),
});

export const curriculumCourse = pgTable("curriculum_course", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  curriculumId: integer("curriculum_id").notNull().references(() => curriculum.id),
  courseId: integer("course_id").notNull().references(() => course.id),
  externalKey: varchar("external_key", { length: 100 }).notNull(),
  cycle: integer("cycle").notNull(),
  displayOrder: integer("display_order").notNull(),
  credit: integer("credit").notNull(),
  category: courseCategoryEnum("category").notNull().default("common"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }),
}, (t) => ({
  uqCurriculumCourse: unique("uq_curriculum_course").on(t.curriculumId, t.courseId),
  uqCurriculumCourseExternalKey: unique("uq_curriculum_course_external_key").on(t.curriculumId, t.externalKey),
  idxCurriculumCourseCurriculum: index("idx_curriculum_course_curriculum").on(t.curriculumId),
}));

export const curriculumCourseSpecialty = pgTable("curriculum_course_specialty", {
  curriculumCourseId: integer("curriculum_course_id").notNull().references(() => curriculumCourse.id),
  specialtyId: integer("specialty_id").notNull().references(() => specialty.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.curriculumCourseId, t.specialtyId] }),
}));

export const coursePrerequisite = pgTable("course_prerequisite", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  curriculumCourseId: integer("curriculum_course_id").notNull().references(() => curriculumCourse.id),
  prerequisiteType: prerequisiteTypeEnum("prerequisite_type").notNull(),
  prerequisiteCurriculumCourseId: integer("prerequisite_curriculum_course_id").references(() => curriculumCourse.id),
  requiredCycle: integer("required_cycle"),
}, (t) => ({
  uqCoursePrerequisiteCourse: uniqueIndex("uq_course_prerequisite_course")
    .on(t.curriculumCourseId, t.prerequisiteCurriculumCourseId)
    .where(sql`prerequisite_curriculum_course_id IS NOT NULL`),
  uqCoursePrerequisiteCompletedCycle: uniqueIndex("uq_course_prerequisite_completed_cycle")
    .on(t.curriculumCourseId, t.prerequisiteType, t.requiredCycle)
    .where(sql`required_cycle IS NOT NULL`),
  idxCoursePrerequisiteCurriculumCourse: index("idx_course_prerequisite_curriculum_course").on(t.curriculumCourseId),
}));

/* =========================
   PROGRESO ESTUDIANTE
========================= */

export const studentCourseProgress = pgTable("student_course_progress", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  studentId: integer("student_id").notNull().references(() => student.id),
  curriculumCourseId: integer("curriculum_course_id").notNull().references(() => curriculumCourse.id),
  status: courseStatusEnum("status").notNull().default("locked"),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => ({
  uqStudentCourseProgress: unique("uq_student_course_progress").on(t.studentId, t.curriculumCourseId),
  idxStudentCourseProgressStudent: index("idx_student_course_progress_student").on(t.studentId),
}));

/* =========================
   PERIODO Y CURSOS
========================= */

export const academicPeriod = pgTable("academic_period", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  startDate: date("start_date", { mode: "date" }).notNull(),
  endDate: date("end_date", { mode: "date" }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const courseOffering = pgTable("course_offering", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  academicPeriodId: integer("academic_period_id").notNull().references(() => academicPeriod.id),
  courseId: integer("course_id").notNull().references(() => course.id),
  startDate: date("start_date", { mode: "date" }),
  endDate: date("end_date", { mode: "date" }),
  isPublished: boolean("is_published").notNull().default(false),
}, (t) => ({
  uqCourseOffering: unique("uq_course_offering").on(t.academicPeriodId, t.courseId),
  idxCourseOfferingPeriod: index("idx_course_offering_period").on(t.academicPeriodId),
}));

export const syllabus = pgTable("syllabus", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  courseOfferingId: integer("course_offering_id").notNull().references(() => courseOffering.id),
  version: varchar("version", { length: 30 }).notNull(),
  title: varchar("title", { length: 150 }),
  driveFileId: varchar("drive_file_id", { length: 120 }).notNull().unique(),
  driveFileUrl: varchar("drive_file_url", { length: 255 }).notNull(),
  originalFileName: varchar("original_file_name", { length: 180 }),
  mimeType: varchar("mime_type", { length: 80 }),
  passingGrade: decimal("passing_grade", { precision: 5, scale: 2 }).notNull().default("11.00"),
  importedAt: timestamp("imported_at", { mode: "date" }).notNull().defaultNow(),
  status: syllabusStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }),
}, (t) => ({
  uqSyllabusOfferingVersion: unique("uq_syllabus_offering_version").on(t.courseOfferingId, t.version),
}));

export const section = pgTable("section", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  courseOfferingId: integer("course_offering_id").notNull().references(() => courseOffering.id),
  teacherId: integer("teacher_id").notNull().references(() => teacher.id),
  code: varchar("code", { length: 30 }).notNull(),
  averageGrade: decimal("average_grade", { precision: 5, scale: 2 }),
  capacity: integer("capacity"),
}, (t) => ({
  uqSectionOfferingCode: unique("uq_section_offering_code").on(t.courseOfferingId, t.code),
  idxSectionCourseOffering: index("idx_section_course_offering").on(t.courseOfferingId),
}));

export const enrollment = pgTable("enrollment", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  studentId: integer("student_id").notNull().references(() => student.id),
  sectionId: integer("section_id").notNull().references(() => section.id),
  status: enrollmentStatusEnum("status").notNull().default("active"),
  enrolledAt: timestamp("enrolled_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => ({
  uqEnrollmentStudentSection: unique("uq_enrollment_student_section").on(t.studentId, t.sectionId),
  idxEnrollmentStudent: index("idx_enrollment_student").on(t.studentId),
}));

export const sectionRepresentative = pgTable("section_representative", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  sectionId: integer("section_id").notNull().references(() => section.id),
  enrollmentId: integer("enrollment_id").notNull().unique().references(() => enrollment.id),
  position: representativePositionEnum("position").notNull(),
  assignedAt: timestamp("assigned_at", { mode: "date" }).notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => ({
  uqActiveSectionRepresentativePosition: uniqueIndex("uq_active_section_representative_position")
    .on(t.sectionId, t.position)
    .where(sql`is_active = TRUE`),
}));

/* =========================
   SEMANA Y HORARIO
========================= */

export const academicWeek = pgTable("academic_week", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  academicPeriodId: integer("academic_period_id").notNull().references(() => academicPeriod.id),
  weekNumber: integer("week_number").notNull(),
  startDate: date("start_date", { mode: "date" }).notNull(),
  endDate: date("end_date", { mode: "date" }).notNull(),
  isHighLoad: boolean("is_high_load").notNull().default(false),
}, (t) => ({
  uqAcademicWeekPeriodNumber: unique("uq_academic_week_period_number").on(t.academicPeriodId, t.weekNumber),
}));

export const scheduleSession = pgTable("schedule_session", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  sectionId: integer("section_id").notNull().references(() => section.id),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  classroom: varchar("classroom", { length: 100 }),
  colorHex: varchar("color_hex", { length: 20 }),
}, (t) => ({
  uqScheduleSession: unique("uq_schedule_session").on(t.sectionId, t.dayOfWeek, t.startTime),
  idxScheduleSessionSection: index("idx_schedule_session_section").on(t.sectionId),
}));

export const classSession = pgTable("class_session", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  scheduleSessionId: integer("schedule_session_id").notNull().references(() => scheduleSession.id),
  academicWeekId: integer("academic_week_id").notNull().references(() => academicWeek.id),
  sessionDate: date("session_date", { mode: "date" }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  classroom: varchar("classroom", { length: 100 }),
  status: classSessionStatusEnum("status").notNull().default("scheduled"),
  note: text("note"),
}, (t) => ({
  uqClassSession: unique("uq_class_session").on(t.scheduleSessionId, t.sessionDate),
}));

/* =========================
   ASESORIAS
========================= */

export const courseAdvisingSession = pgTable("course_advising_session", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  courseOfferingId: integer("course_offering_id").notNull().references(() => courseOffering.id),
  teacherId: integer("teacher_id").notNull().references(() => teacher.id),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  classroom: varchar("classroom", { length: 100 }),
  meetingUrl: varchar("meeting_url", { length: 255 }),
  modality: advisingModalityEnum("modality").notNull().default("hybrid"),
  note: text("note"),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => ({
  uqCourseAdvisingSession: unique("uq_course_advising_session").on(t.courseOfferingId, t.teacherId, t.dayOfWeek, t.startTime),
}));

/* =========================
   EVALUACIONES Y NOTAS
========================= */

export const assessmentType = pgTable("assessment_type", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  abbreviation: varchar("abbreviation", { length: 30 }),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
});

export const assessment = pgTable("assessment", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  syllabusId: integer("syllabus_id").notNull().references(() => syllabus.id),
  assessmentTypeId: integer("assessment_type_id").notNull().references(() => assessmentType.id),
  externalKey: varchar("external_key", { length: 100 }),
  code: varchar("code", { length: 30 }).notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  weekNumber: integer("week_number"),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),
  orderNumber: integer("order_number").notNull(),
  rawTypeName: varchar("raw_type_name", { length: 150 }),
}, (t) => ({
  uqAssessmentSyllabusCode: unique("uq_assessment_syllabus_code").on(t.syllabusId, t.code),
  uqAssessmentSyllabusOrder: unique("uq_assessment_syllabus_order").on(t.syllabusId, t.orderNumber),
  uqAssessmentSyllabusExternalKey: uniqueIndex("uq_assessment_syllabus_external_key")
    .on(t.syllabusId, t.externalKey)
    .where(sql`external_key IS NOT NULL`),
  idxAssessmentSyllabus: index("idx_assessment_syllabus").on(t.syllabusId),
}));

export const assessmentEvent = pgTable("assessment_event", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  assessmentId: integer("assessment_id").notNull().references(() => assessment.id),
  sectionId: integer("section_id").notNull().references(() => section.id),
  academicWeekId: integer("academic_week_id").notNull().references(() => academicWeek.id),
  scheduledDate: date("scheduled_date", { mode: "date" }),
  startTime: time("start_time"),
  endTime: time("end_time"),
  classroom: varchar("classroom", { length: 100 }),
}, (t) => ({
  uqAssessmentEvent: unique("uq_assessment_event").on(t.assessmentId, t.sectionId),
}));

export const studentScore = pgTable("student_score", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  enrollmentId: integer("enrollment_id").notNull().references(() => enrollment.id),
  assessmentId: integer("assessment_id").notNull().references(() => assessment.id),
  value: decimal("value", { precision: 5, scale: 2 }),
  registeredAt: timestamp("registered_at", { mode: "date" }).notNull().defaultNow(),
  comment: text("comment"),
}, (t) => ({
  uqStudentScore: unique("uq_student_score").on(t.enrollmentId, t.assessmentId),
  idxStudentScoreEnrollment: index("idx_student_score_enrollment").on(t.enrollmentId),
}));

/* =========================
   ASISTENCIA
========================= */

export const attendance = pgTable("attendance", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  enrollmentId: integer("enrollment_id").notNull().references(() => enrollment.id),
  classSessionId: integer("class_session_id").notNull().references(() => classSession.id),
  status: attendanceStatusEnum("status").notNull(),
  hourQuantity: decimal("hour_quantity", { precision: 4, scale: 2 }).notNull().default("0.00"),
}, (t) => ({
  uqAttendance: unique("uq_attendance").on(t.enrollmentId, t.classSessionId),
}));

/* =========================
   ALERTAS Y ANUNCIOS
========================= */

export const announcement = pgTable("announcement", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  sectionRepresentativeId: integer("section_representative_id").notNull().references(() => sectionRepresentative.id),
  title: varchar("title", { length: 150 }).notNull(),
  message: text("message").notNull(),
  publishedAt: timestamp("published_at", { mode: "date" }).notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const alert = pgTable("alert", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  studentId: integer("student_id").notNull().references(() => student.id),
  type: alertTypeEnum("type").notNull(),
  title: varchar("title", { length: 150 }).notNull(),
  message: text("message").notNull(),
  colorHex: varchar("color_hex", { length: 20 }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => ({
  idxAlertStudent: index("idx_alert_student").on(t.studentId),
}));
