import type { EventBus } from "../../events/index.js";
import type { CourseDetailRepository } from "./course-detail.repository.js";

export class CourseDetailService {
  constructor(
    readonly repository: CourseDetailRepository,
    readonly events: EventBus,
  ) {}
}
