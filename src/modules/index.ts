import type { Hono } from "hono";
import { academicProfileRoutes } from "./academic-profile/index.js";
import { advisingRoutes } from "./advising/index.js";
import { alertsRoutes } from "./alerts/index.js";
import { authRoutes } from "./auth/index.js";
import { courseDetailRoutes } from "./course-detail/index.js";
import { curriculumRoutes } from "./curriculum/index.js";
import { gradesRoutes } from "./grades/index.js";
import { simulatedGradesRoutes } from "./simulated-grades/index.js";
import { scheduleRoutes } from "./schedule/index.js";
import { sectionManagementRoutes } from "./section-management/index.js";
import { chatRoutes } from "./chat/index.js";

export const registerModules = (app: Hono) => {
  app.route("/auth", authRoutes);
  app.route("/academic-profile", academicProfileRoutes);
  app.route("/curriculum", curriculumRoutes);
  app.route("/grades", gradesRoutes);
  app.route("/simulated-grades", simulatedGradesRoutes);
  app.route("/schedule", scheduleRoutes);
  app.route("/course-detail", courseDetailRoutes);
  app.route("/alerts", alertsRoutes);
  app.route("/section-management", sectionManagementRoutes);
  app.route("/advising", advisingRoutes);
  app.route("/chat", chatRoutes);
};
