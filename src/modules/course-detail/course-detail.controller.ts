import type { CourseDetailService } from "./course-detail.service.js";

export class CourseDetailController {
  constructor(readonly service: CourseDetailService) {}
}
