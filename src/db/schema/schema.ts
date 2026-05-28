import {
  boolean,
  check,
  date,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const curriculumSimulationStatusEnum = pgEnum("curriculum_simulation_status", [
  "planned",
  "simulated_completed",
]);

export const studentCourseStatusEnum = pgEnum("student_course_status", [
  "in_progress",
  "approved",
  "failed",
  "withdrawn",
]);

export const representativePositionEnum = pgEnum("representative_position", [
  "delegate",
  "subdelegate",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "active",
  "withdrawn",
  "completed",
]);

export const alertTypeEnum = pgEnum("alert_type", ["academic_risk", "high_load"]);

export const advisingModalityEnum = pgEnum("advising_modality", [
  "classroom",
  "virtual",
  "hybrid",
]);

export const courseCategoryEnum = pgEnum("course_category", [
  "general_studies",
  "common",
  "faculty",
  "elective",
]);

export const prerequisiteTypeEnum = pgEnum("prerequisite_type", [
  "course",
  "completed_cycle",
]);

export const studentSpecialtyTypeEnum = pgEnum("student_specialty_type", [
  "primary",
  "interest",
]);

export const appUser = pgTable("app_user", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  fullName: varchar("full_name", { length: 150 }).notNull(),
  institutionalEmail: varchar("institutional_email", { length: 150 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
});

export const student = pgTable("student", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => appUser.id),
  careerId: integer("career_id").notNull(),
  curriculumId: integer("curriculum_id").notNull(),
  currentLevel: integer("current_level"),
}, (t) => ({
  uqStudentIdCareer: unique("uq_student_id_career").on(t.id, t.careerId),
  uqStudentIdCurriculum: unique("uq_student_id_curriculum").on(t.id, t.curriculumId),
  chkStudentCurrentLevel: check("chk_student_current_level", sql`${t.currentLevel} IS NULL OR ${t.currentLevel} BETWEEN 1 AND 10`),
  idxStudentUserId: index("idx_student_user_id").on(t.userId),
  idxStudentCurriculumId: index("idx_student_curriculum_id").on(t.curriculumId),
}));

export const career = pgTable("career", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  faculty: varchar("faculty", { length: 120 }).notNull(),
});

export const teacher = pgTable("teacher", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  teacherCode: varchar("teacher_code", { length: 50 }).unique(),
  fullName: varchar("full_name", { length: 150 }).notNull(),
  institutionalEmail: varchar("institutional_email", { length: 150 }).unique(),
});

export const specialty = pgTable("specialty", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  careerId: integer("career_id").notNull().references(() => career.id),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
}, (t) => ({
  uqSpecialtyCareerName: unique("uq_specialty_career_name").on(t.careerId, t.name),
}));

export const studentSpecialty = pgTable("student_specialty", {
  studentId: integer("student_id").notNull().references(() => student.id),
  specialtyId: integer("specialty_id").notNull().references(() => specialty.id),
  selectionType: studentSpecialtyTypeEnum("selection_type").notNull().default("interest"),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => ({
  pk: primaryKey({ columns: [t.studentId, t.specialtyId] }),
  idxStudentSpecialtyStudent: index("idx_student_specialty_student").on(t.studentId),
  uqStudentSpecialtyActivePrimary: uniqueIndex("uq_student_specialty_active_primary")
    .on(t.studentId)
    .where(sql`${t.selectionType} = 'primary' AND ${t.isActive} = TRUE`),
}));

export const curriculum = pgTable("curriculum", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  careerId: integer("career_id").notNull().unique().references(() => career.id),
  name: varchar("name", { length: 120 }).notNull(),
}, (t) => ({
  uqCurriculumIdCareer: unique("uq_curriculum_id_career").on(t.id, t.careerId),
}));

export const course = pgTable("course", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  defaultCredit: integer("default_credit").notNull(),
  originFaculty: varchar("origin_faculty", { length: 120 }),
}, (t) => ({
  chkCourseDefaultCredit: check("chk_course_default_credit", sql`${t.defaultCredit} > 0`),
}));

export const curriculumCourse = pgTable("curriculum_course", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  curriculumId: integer("curriculum_id").notNull().references(() => curriculum.id),
  courseId: integer("course_id").notNull().references(() => course.id),
  cycle: integer("cycle").notNull(),
  displayOrder: integer("display_order").notNull(),
  credit: integer("credit").notNull(),
  category: courseCategoryEnum("category").notNull().default("faculty"),
}, (t) => ({
  uqCurriculumCourse: unique("uq_curriculum_course").on(t.curriculumId, t.courseId),
  uqCurriculumCourseIdCurriculum: unique("uq_curriculum_course_id_curriculum").on(t.id, t.curriculumId),
  chkCurriculumCourseCycle: check("chk_curriculum_course_cycle", sql`${t.cycle} > 0`),
  chkCurriculumCourseDisplayOrder: check("chk_curriculum_course_display_order", sql`${t.displayOrder} > 0`),
  chkCurriculumCourseCredit: check("chk_curriculum_course_credit", sql`${t.credit} > 0`),
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
  curriculumId: integer("curriculum_id").notNull().references(() => curriculum.id),
  curriculumCourseId: integer("curriculum_course_id").notNull().references(() => curriculumCourse.id),
  prerequisiteType: prerequisiteTypeEnum("prerequisite_type").notNull(),
  prerequisiteCurriculumCourseId: integer("prerequisite_curriculum_course_id").references(() => curriculumCourse.id),
  requiredCycle: integer("required_cycle"),
}, (t) => ({
  uqCoursePrerequisiteCourse: uniqueIndex("uq_course_prerequisite_course")
    .on(t.curriculumCourseId, t.prerequisiteCurriculumCourseId)
    .where(sql`${t.prerequisiteCurriculumCourseId} IS NOT NULL`),
  uqCoursePrerequisiteCompletedCycle: uniqueIndex("uq_course_prerequisite_completed_cycle")
    .on(t.curriculumCourseId, t.prerequisiteType, t.requiredCycle)
    .where(sql`${t.requiredCycle} IS NOT NULL`),
  chkCoursePrerequisiteKind: check("chk_course_prerequisite_kind", sql`
    (${t.prerequisiteType} = 'course' AND ${t.prerequisiteCurriculumCourseId} IS NOT NULL AND ${t.requiredCycle} IS NULL)
    OR
    (${t.prerequisiteType} = 'completed_cycle' AND ${t.prerequisiteCurriculumCourseId} IS NULL AND ${t.requiredCycle} IS NOT NULL)
  `),
  chkCoursePrerequisiteRequiredCycle: check("chk_course_prerequisite_required_cycle", sql`${t.requiredCycle} IS NULL OR ${t.requiredCycle} > 0`),
  chkCoursePrerequisiteNotSelf: check("chk_course_prerequisite_not_self", sql`${t.prerequisiteCurriculumCourseId} IS NULL OR ${t.curriculumCourseId} <> ${t.prerequisiteCurriculumCourseId}`),
  idxCoursePrerequisiteCurriculumCourse: index("idx_course_prerequisite_curriculum_course").on(t.curriculumCourseId),
}));

export const studentCurriculumSimulation = pgTable("student_curriculum_simulation", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  studentId: integer("student_id").notNull().references(() => student.id),
  curriculumId: integer("curriculum_id").notNull().references(() => curriculum.id),
  curriculumCourseId: integer("curriculum_course_id").notNull().references(() => curriculumCourse.id),
  status: curriculumSimulationStatusEnum("status").notNull(),
}, (t) => ({
  uqStudentCurriculumSimulation: unique("uq_student_curriculum_simulation").on(t.studentId, t.curriculumCourseId),
  idxStudentCurriculumSimulationStudent: index("idx_student_curriculum_simulation_student").on(t.studentId),
}));

export const academicPeriod = pgTable("academic_period", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  startDate: date("start_date", { mode: "date" }).notNull(),
  endDate: date("end_date", { mode: "date" }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => ({
  chkAcademicPeriodDates: check("chk_academic_period_dates", sql`${t.startDate} < ${t.endDate}`),
  uqAcademicPeriodSingleActive: uniqueIndex("uq_academic_period_single_active")
    .on(t.isActive)
    .where(sql`${t.isActive} = TRUE`),
}));

export const courseOffering = pgTable("course_offering", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  academicPeriodId: integer("academic_period_id").notNull().references(() => academicPeriod.id),
  courseId: integer("course_id").notNull().references(() => course.id),
}, (t) => ({
  uqCourseOffering: unique("uq_course_offering").on(t.academicPeriodId, t.courseId),
  idxCourseOfferingPeriod: index("idx_course_offering_period").on(t.academicPeriodId),
}));

export const syllabus = pgTable("syllabus", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  courseOfferingId: integer("course_offering_id").notNull().references(() => courseOffering.id),
  title: varchar("title", { length: 150 }),
  driveFileId: varchar("drive_file_id", { length: 120 }).notNull().unique(),
  driveFileUrl: varchar("drive_file_url", { length: 255 }).notNull(),
}, (t) => ({
  uqSyllabusCourseOffering: unique("uq_syllabus_course_offering").on(t.courseOfferingId),
}));

export const section = pgTable("section", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  courseOfferingId: integer("course_offering_id").notNull().references(() => courseOffering.id),
  teacherId: integer("teacher_id").notNull().references(() => teacher.id),
  code: varchar("code", { length: 30 }).notNull(),
}, (t) => ({
  uqSectionOfferingCode: unique("uq_section_offering_code").on(t.courseOfferingId, t.code),
  uqSectionIdOffering: unique("uq_section_id_offering").on(t.id, t.courseOfferingId),
  idxSectionCourseOffering: index("idx_section_course_offering").on(t.courseOfferingId),
}));

export const enrollment = pgTable("enrollment", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  studentId: integer("student_id").notNull().references(() => student.id),
  sectionId: integer("section_id").notNull().references(() => section.id),
  status: enrollmentStatusEnum("status").notNull().default("active"),
  attendedHours: decimal("attended_hours", { precision: 5, scale: 2 }).notNull().default("0"),
  absentHours: decimal("absent_hours", { precision: 5, scale: 2 }).notNull().default("0"),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }).notNull().default("0"),
}, (t) => ({
  uqEnrollmentStudentSection: unique("uq_enrollment_student_section").on(t.studentId, t.sectionId),
  uqEnrollmentIdSection: unique("uq_enrollment_id_section").on(t.id, t.sectionId),
  chkEnrollmentAttendedHours: check("chk_enrollment_attended_hours", sql`${t.attendedHours} >= 0`),
  chkEnrollmentAbsentHours: check("chk_enrollment_absent_hours", sql`${t.absentHours} >= 0`),
  chkEnrollmentTotalHours: check("chk_enrollment_total_hours", sql`${t.totalHours} >= 0`),
  chkEnrollmentAttendanceHours: check("chk_enrollment_attendance_hours", sql`${t.attendedHours} + ${t.absentHours} <= ${t.totalHours}`),
  idxEnrollmentStudent: index("idx_enrollment_student").on(t.studentId),
}));

export const studentCourseProgress = pgTable("student_course_progress", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  studentId: integer("student_id").notNull().references(() => student.id),
  curriculumId: integer("curriculum_id").notNull().references(() => curriculum.id),
  curriculumCourseId: integer("curriculum_course_id").notNull().references(() => curriculumCourse.id),
  status: studentCourseStatusEnum("status").notNull(),
}, (t) => ({
  uqStudentCourseProgress: unique("uq_student_course_progress").on(t.studentId, t.curriculumCourseId),
  idxStudentCourseProgressStudent: index("idx_student_course_progress_student").on(t.studentId),
  idxStudentCourseProgressCurriculumCourse: index("idx_student_course_progress_curriculum_course").on(t.curriculumCourseId),
}));

export const sectionRepresentative = pgTable("section_representative", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  sectionId: integer("section_id").notNull().references(() => section.id),
  enrollmentId: integer("enrollment_id").notNull().unique().references(() => enrollment.id),
  position: representativePositionEnum("position").notNull(),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => ({
  uqActiveSectionRepresentativePosition: uniqueIndex("uq_active_section_representative_position")
    .on(t.sectionId, t.position)
    .where(sql`${t.isActive} = TRUE`),
}));

export const academicWeek = pgTable("academic_week", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  academicPeriodId: integer("academic_period_id").notNull().references(() => academicPeriod.id),
  weekNumber: integer("week_number").notNull(),
  startDate: date("start_date", { mode: "date" }).notNull(),
  endDate: date("end_date", { mode: "date" }).notNull(),
}, (t) => ({
  uqAcademicWeekPeriodNumber: unique("uq_academic_week_period_number").on(t.academicPeriodId, t.weekNumber),
  chkAcademicWeekNumber: check("chk_academic_week_number", sql`${t.weekNumber} > 0`),
  chkAcademicWeekDates: check("chk_academic_week_dates", sql`${t.startDate} <= ${t.endDate}`),
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
  chkScheduleSessionDay: check("chk_schedule_session_day", sql`${t.dayOfWeek} BETWEEN 1 AND 7`),
  chkScheduleSessionTime: check("chk_schedule_session_time", sql`${t.startTime} < ${t.endTime}`),
  idxScheduleSessionSection: index("idx_schedule_session_section").on(t.sectionId),
}));

export const courseAdvisingSession = pgTable("course_advising_session", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  courseOfferingId: integer("course_offering_id").notNull().references(() => courseOffering.id),
  sectionId: integer("section_id").references(() => section.id),
  teacherId: integer("teacher_id").notNull().references(() => teacher.id),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  classroom: varchar("classroom", { length: 100 }),
  meetingUrl: varchar("meeting_url", { length: 255 }),
  modality: advisingModalityEnum("modality").notNull().default("hybrid"),
  note: text("note"),
}, (t) => ({
  uqCourseAdvisingSessionCourse: uniqueIndex("uq_course_advising_session_course")
    .on(t.courseOfferingId, t.teacherId, t.dayOfWeek, t.startTime)
    .where(sql`${t.sectionId} IS NULL`),
  uqCourseAdvisingSessionSection: uniqueIndex("uq_course_advising_session_section")
    .on(t.sectionId, t.teacherId, t.dayOfWeek, t.startTime)
    .where(sql`${t.sectionId} IS NOT NULL`),
  chkCourseAdvisingDay: check("chk_course_advising_day", sql`${t.dayOfWeek} BETWEEN 1 AND 7`),
  chkCourseAdvisingTime: check("chk_course_advising_time", sql`${t.startTime} < ${t.endTime}`),
  idxCourseAdvisingSessionCourseOffering: index("idx_course_advising_session_course_offering").on(t.courseOfferingId),
}));

export const assessmentType = pgTable("assessment_type", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  abbreviation: varchar("abbreviation", { length: 30 }),
  description: text("description"),
});

export const assessment = pgTable("assessment", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  syllabusId: integer("syllabus_id").notNull().references(() => syllabus.id),
  assessmentTypeId: integer("assessment_type_id").notNull().references(() => assessmentType.id),
  code: varchar("code", { length: 30 }).notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  weekNumber: integer("week_number").notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),
}, (t) => ({
  uqAssessmentSyllabusCode: unique("uq_assessment_syllabus_code").on(t.syllabusId, t.code),
  chkAssessmentWeekNumber: check("chk_assessment_week_number", sql`${t.weekNumber} > 0`),
  chkAssessmentWeight: check("chk_assessment_weight", sql`${t.weight} > 0 AND ${t.weight} <= 100`),
  idxAssessmentSyllabus: index("idx_assessment_syllabus").on(t.syllabusId),
}));

export const studentScore = pgTable("student_score", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  enrollmentId: integer("enrollment_id").notNull().references(() => enrollment.id),
  assessmentId: integer("assessment_id").notNull().references(() => assessment.id),
  value: decimal("value", { precision: 5, scale: 2 }),
}, (t) => ({
  uqStudentScore: unique("uq_student_score").on(t.enrollmentId, t.assessmentId),
  chkStudentScoreValue: check("chk_student_score_value", sql`${t.value} IS NULL OR ${t.value} BETWEEN 0 AND 20`),
  idxStudentScoreEnrollment: index("idx_student_score_enrollment").on(t.enrollmentId),
}));

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
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => ({
  idxAlertStudent: index("idx_alert_student").on(t.studentId),
}));
