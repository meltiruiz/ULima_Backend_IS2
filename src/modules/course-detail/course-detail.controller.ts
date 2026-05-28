import type { CourseDetailService } from "./course-detail.service";

export class CourseDetailController {
  constructor(readonly service: CourseDetailService) {}
}
