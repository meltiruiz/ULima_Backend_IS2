import type { Hono } from "hono";
import { academicProfileRoutes } from "./academic-profile";
import { alertsRoutes } from "./alerts";
import { authRoutes } from "./auth";
import { courseDetailRoutes } from "./course-detail";
import { curriculumRoutes } from "./curriculum";
import { gradesRoutes } from "./grades";
import { scheduleRoutes } from "./schedule";
import { sectionManagementRoutes } from "./section-management";

export const registerModules = (app: Hono) => {
  app.route("/auth", authRoutes);
  app.route("/academic-profile", academicProfileRoutes);
  app.route("/curriculum", curriculumRoutes);
  app.route("/grades", gradesRoutes);
  app.route("/schedule", scheduleRoutes);
  app.route("/course-detail", courseDetailRoutes);
  app.route("/alerts", alertsRoutes);
  app.route("/section-management", sectionManagementRoutes);
};
