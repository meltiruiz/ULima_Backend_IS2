import { Hono } from "hono";
import type { CourseDetailController } from "./course-detail.controller";

export const createCourseDetailRoutes = (_controller: CourseDetailController) => new Hono();
