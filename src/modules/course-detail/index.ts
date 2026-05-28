import { db } from "../../db";
import { eventBus } from "../../events";
import { CourseDetailController } from "./course-detail.controller";
import { CourseDetailRepository } from "./course-detail.repository";
import { createCourseDetailRoutes } from "./course-detail.routes";
import { CourseDetailService } from "./course-detail.service";

const courseDetailRepository = new CourseDetailRepository(db);
const courseDetailService = new CourseDetailService(courseDetailRepository, eventBus);
const courseDetailController = new CourseDetailController(courseDetailService);

export const courseDetailRoutes = createCourseDetailRoutes(courseDetailController);

export { CourseDetailController } from "./course-detail.controller";
export { CourseDetailRepository } from "./course-detail.repository";
export { CourseDetailService } from "./course-detail.service";
export { sectionIdParamSchema } from "./course-detail.schemas";
export type { CourseDetailTab } from "./course-detail.types";
