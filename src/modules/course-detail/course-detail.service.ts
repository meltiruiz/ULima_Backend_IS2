import type { EventBus } from "../../events";
import type { CourseDetailRepository } from "./course-detail.repository";

export class CourseDetailService {
  constructor(
    readonly repository: CourseDetailRepository,
    readonly events: EventBus,
  ) {}
}
