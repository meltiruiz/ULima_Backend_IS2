import { relations } from "drizzle-orm";
import {
  appUser,
  student,
  teacher,
  career,
  specialty,
  studentSpecialty,
  studyPlan,
  curriculum,
  course,
  curriculumCourse,
  curriculumCourseSpecialty,
  coursePrerequisite,
  studentCourseProgress,
  academicPeriod,
  courseOffering,
  syllabus,
  section,
  enrollment,
  sectionRepresentative,
  academicWeek,
  scheduleSession,
  classSession,
  courseAdvisingSession,
  assessmentType,
  assessment,
  assessmentEvent,
  studentScore,
  attendance,
  announcement,
  alert
} from "../schema/schema";

/* ============================================================================
   RELACIONES DE USUARIOS
   ============================================================================ */

export const appUserRelations = relations(appUser, ({ one }) => ({
  student: one(student),
}));

export const studentRelations = relations(student, ({ one, many }) => ({
  user: one(appUser, {
    fields: [student.userId],
    references: [appUser.id],
  }),
  career: one(career, {
    fields: [student.careerId],
    references: [career.id],
  }),
  curriculum: one(curriculum, {
    fields: [student.curriculumId],
    references: [curriculum.id],
  }),
  specialties: many(studentSpecialty),
  courseProgress: many(studentCourseProgress),
  enrollments: many(enrollment),
  alerts: many(alert),
}));

export const teacherRelations = relations(teacher, ({ many }) => ({
  sections: many(section),
  advisingSessions: many(courseAdvisingSession),
}));

/* ============================================================================
   RELACIONES DE ESTRUCTURA ACADÉMICA
   ============================================================================ */

export const careerRelations = relations(career, ({ many }) => ({
  students: many(student),
  specialties: many(specialty),
  studyPlans: many(studyPlan),
}));

export const specialtyRelations = relations(specialty, ({ one, many }) => ({
  career: one(career, {
    fields: [specialty.careerId],
    references: [career.id],
  }),
  students: many(studentSpecialty),
  curriculumCourses: many(curriculumCourseSpecialty),
}));

export const studentSpecialtyRelations = relations(studentSpecialty, ({ one }) => ({
  student: one(student, {
    fields: [studentSpecialty.studentId],
    references: [student.id],
  }),
  specialty: one(specialty, {
    fields: [studentSpecialty.specialtyId],
    references: [specialty.id],
  }),
}));

export const studyPlanRelations = relations(studyPlan, ({ one, many }) => ({
  career: one(career, {
    fields: [studyPlan.careerId],
    references: [career.id],
  }),
  curriculums: many(curriculum),
}));

export const curriculumRelations = relations(curriculum, ({ one, many }) => ({
  studyPlan: one(studyPlan, {
    fields: [curriculum.studyPlanId],
    references: [studyPlan.id],
  }),
  students: many(student),
  curriculumCourses: many(curriculumCourse),
}));

export const courseRelations = relations(course, ({ many }) => ({
  curriculumCourses: many(curriculumCourse),
  offerings: many(courseOffering),
}));

export const curriculumCourseRelations = relations(curriculumCourse, ({ one, many }) => ({
  curriculum: one(curriculum, {
    fields: [curriculumCourse.curriculumId],
    references: [curriculum.id],
  }),
  course: one(course, {
    fields: [curriculumCourse.courseId],
    references: [course.id],
  }),
  specialties: many(curriculumCourseSpecialty),
  prerequisites: many(coursePrerequisite, { relationName: "curriculumCourse" }),
  prerequisiteFor: many(coursePrerequisite, { relationName: "prerequisiteCurriculumCourse" }),
  courseProgress: many(studentCourseProgress),
}));

export const curriculumCourseSpecialtyRelations = relations(curriculumCourseSpecialty, ({ one }) => ({
  curriculumCourse: one(curriculumCourse, {
    fields: [curriculumCourseSpecialty.curriculumCourseId],
    references: [curriculumCourse.id],
  }),
  specialty: one(specialty, {
    fields: [curriculumCourseSpecialty.specialtyId],
    references: [specialty.id],
  }),
}));

export const coursePrerequisiteRelations = relations(coursePrerequisite, ({ one }) => ({
  curriculumCourse: one(curriculumCourse, {
    fields: [coursePrerequisite.curriculumCourseId],
    references: [curriculumCourse.id],
    relationName: "curriculumCourse",
  }),
  prerequisiteCurriculumCourse: one(curriculumCourse, {
    fields: [coursePrerequisite.prerequisiteCurriculumCourseId],
    references: [curriculumCourse.id],
    relationName: "prerequisiteCurriculumCourse",
  }),
}));

/* ============================================================================
   RELACIONES DE PROGRESO DE ESTUDIANTE
   ============================================================================ */

export const studentCourseProgressRelations = relations(studentCourseProgress, ({ one }) => ({
  student: one(student, {
    fields: [studentCourseProgress.studentId],
    references: [student.id],
  }),
  curriculumCourse: one(curriculumCourse, {
    fields: [studentCourseProgress.curriculumCourseId],
    references: [curriculumCourse.id],
  }),
}));

/* ============================================================================
   RELACIONES DE PERIODO Y CURSOS
   ============================================================================ */

export const academicPeriodRelations = relations(academicPeriod, ({ many }) => ({
  offerings: many(courseOffering),
  academicWeeks: many(academicWeek),
}));

export const courseOfferingRelations = relations(courseOffering, ({ one, many }) => ({
  academicPeriod: one(academicPeriod, {
    fields: [courseOffering.academicPeriodId],
    references: [academicPeriod.id],
  }),
  course: one(course, {
    fields: [courseOffering.courseId],
    references: [course.id],
  }),
  syllabi: many(syllabus),
  sections: many(section),
  advisingSessions: many(courseAdvisingSession),
}));

export const syllabusRelations = relations(syllabus, ({ one, many }) => ({
  courseOffering: one(courseOffering, {
    fields: [syllabus.courseOfferingId],
    references: [courseOffering.id],
  }),
  assessments: many(assessment),
}));

export const sectionRelations = relations(section, ({ one, many }) => ({
  courseOffering: one(courseOffering, {
    fields: [section.courseOfferingId],
    references: [courseOffering.id],
  }),
  teacher: one(teacher, {
    fields: [section.teacherId],
    references: [teacher.id],
  }),
  enrollments: many(enrollment),
  representatives: many(sectionRepresentative),
  scheduleSessions: many(scheduleSession),
  assessmentEvents: many(assessmentEvent),
}));

export const enrollmentRelations = relations(enrollment, ({ one, many }) => ({
  student: one(student, {
    fields: [enrollment.studentId],
    references: [student.id],
  }),
  section: one(section, {
    fields: [enrollment.sectionId],
    references: [section.id],
  }),
  representative: one(sectionRepresentative),
  scores: many(studentScore),
  attendances: many(attendance),
}));

export const sectionRepresentativeRelations = relations(sectionRepresentative, ({ one, many }) => ({
  section: one(section, {
    fields: [sectionRepresentative.sectionId],
    references: [section.id],
  }),
  enrollment: one(enrollment, {
    fields: [sectionRepresentative.enrollmentId],
    references: [enrollment.id],
  }),
  announcements: many(announcement),
}));

/* ============================================================================
   RELACIONES DE SEMANA Y HORARIO
   ============================================================================ */

export const academicWeekRelations = relations(academicWeek, ({ one, many }) => ({
  academicPeriod: one(academicPeriod, {
    fields: [academicWeek.academicPeriodId],
    references: [academicPeriod.id],
  }),
  classSessions: many(classSession),
  assessmentEvents: many(assessmentEvent),
}));

export const scheduleSessionRelations = relations(scheduleSession, ({ one, many }) => ({
  section: one(section, {
    fields: [scheduleSession.sectionId],
    references: [section.id],
  }),
  classSessions: many(classSession),
}));

export const classSessionRelations = relations(classSession, ({ one, many }) => ({
  scheduleSession: one(scheduleSession, {
    fields: [classSession.scheduleSessionId],
    references: [scheduleSession.id],
  }),
  academicWeek: one(academicWeek, {
    fields: [classSession.academicWeekId],
    references: [academicWeek.id],
  }),
  attendances: many(attendance),
}));

/* ============================================================================
   RELACIONES DE ASESORÍAS
   ============================================================================ */

export const courseAdvisingSessionRelations = relations(courseAdvisingSession, ({ one }) => ({
  courseOffering: one(courseOffering, {
    fields: [courseAdvisingSession.courseOfferingId],
    references: [courseOffering.id],
  }),
  teacher: one(teacher, {
    fields: [courseAdvisingSession.teacherId],
    references: [teacher.id],
  }),
}));

/* ============================================================================
   RELACIONES DE EVALUACIONES Y NOTAS
   ============================================================================ */

export const assessmentTypeRelations = relations(assessmentType, ({ many }) => ({
  assessments: many(assessment),
}));

export const assessmentRelations = relations(assessment, ({ one, many }) => ({
  syllabus: one(syllabus, {
    fields: [assessment.syllabusId],
    references: [syllabus.id],
  }),
  assessmentType: one(assessmentType, {
    fields: [assessment.assessmentTypeId],
    references: [assessmentType.id],
  }),
  events: many(assessmentEvent),
  scores: many(studentScore),
}));

export const assessmentEventRelations = relations(assessmentEvent, ({ one }) => ({
  assessment: one(assessment, {
    fields: [assessmentEvent.assessmentId],
    references: [assessment.id],
  }),
  section: one(section, {
    fields: [assessmentEvent.sectionId],
    references: [section.id],
  }),
  academicWeek: one(academicWeek, {
    fields: [assessmentEvent.academicWeekId],
    references: [academicWeek.id],
  }),
}));

export const studentScoreRelations = relations(studentScore, ({ one }) => ({
  enrollment: one(enrollment, {
    fields: [studentScore.enrollmentId],
    references: [enrollment.id],
  }),
  assessment: one(assessment, {
    fields: [studentScore.assessmentId],
    references: [assessment.id],
  }),
}));

/* ============================================================================
   RELACIONES DE ASISTENCIA, ANUNCIOS Y ALERTAS
   ============================================================================ */

export const attendanceRelations = relations(attendance, ({ one }) => ({
  enrollment: one(enrollment, {
    fields: [attendance.enrollmentId],
    references: [enrollment.id],
  }),
  classSession: one(classSession, {
    fields: [attendance.classSessionId],
    references: [classSession.id],
  }),
}));

export const announcementRelations = relations(announcement, ({ one }) => ({
  representative: one(sectionRepresentative, {
    fields: [announcement.sectionRepresentativeId],
    references: [sectionRepresentative.id],
  }),
}));

export const alertRelations = relations(alert, ({ one }) => ({
  student: one(student, {
    fields: [alert.studentId],
    references: [student.id],
  }),
}));
