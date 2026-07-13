import { Hono } from "hono";
import type { CourseDetailController } from "./course-detail.controller.js";
import { authMiddleware, requireRole, STUDENT_ROLES } from "../../shared/middleware/auth-middleware.js";

export const createCourseDetailRoutes = (controller: CourseDetailController) => {
  const app = new Hono();

  // Todas las rutas de detalle de curso exponen datos academicos sensibles.
  app.use("*", authMiddleware);
  app.use("*", requireRole(...STUDENT_ROLES, "teacher"));

  app.get("/sections", (c) => controller.getSections(c));
  app.get("/teachers", (c) => controller.getTeachers(c));
  app.get("/enrollments", (c) => controller.getEnrollments(c));
  app.get("/sections/:sectionId", (c) => controller.getSection(c));
  app.get("/sections/:sectionId/announcements", (c) => controller.getAnnouncements(c));
  app.get("/sections/:sectionId/contacts", (c) => controller.getContacts(c));

  return app;
};
