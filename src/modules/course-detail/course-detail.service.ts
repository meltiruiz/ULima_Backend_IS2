import type { EventBus } from "../../events/index.js";
import type { CourseDetailRepository } from "./course-detail.repository.js";
import {
  mapCourseAnnouncement,
  mapCourseContacts,
  mapCourseEnrollment,
  mapCourseSection,
  mapCourseTeacher,
} from "./course-detail.mapper.js";
import type {
  AnnouncementsResult,
  ContactsResult,
  EnrollmentsResult,
  SectionResult,
  SectionsResult,
  TeachersResult,
} from "./course-detail.types.js";

export class CourseDetailService {
  constructor(
    readonly repository: CourseDetailRepository,
    readonly events: EventBus,
  ) {}

  async getSections(): Promise<SectionsResult> {
    const rows = await this.repository.findSections();
    return { secciones: rows.map(mapCourseSection) };
  }

  async getSection(sectionId: number): Promise<SectionResult> {
    const { secciones } = await this.getSections();
    return {
      section: secciones.find((section) => section.idSeccion === String(sectionId)) ?? null,
    };
  }

  async getTeachers(): Promise<TeachersResult> {
    const rows = await this.repository.findTeachers();
    return { docentes: rows.map(mapCourseTeacher) };
  }

  async getEnrollments(): Promise<EnrollmentsResult> {
    const rows = await this.repository.findEnrollments();
    return { enrollments: rows.map(mapCourseEnrollment) };
  }

  async getAnnouncements(sectionId: number): Promise<AnnouncementsResult> {
    const rows = await this.repository.findAnnouncementsBySectionId(sectionId);
    return {
      anuncios: rows.map((row) => mapCourseAnnouncement(row, sectionId)),
    };
  }

  async getContacts(sectionId: number): Promise<ContactsResult> {
    const [teacherRows, jpRows, studentRows] = await Promise.all([
      this.repository.findContactTeacherRowsBySectionId(sectionId),
      this.repository.findContactJpRowsBySectionId(sectionId),
      this.repository.findContactStudentRowsBySectionId(sectionId),
    ]);

    return mapCourseContacts(teacherRows, jpRows, studentRows);
  }
}
