import type { EventBus } from "../../events/index.js";
import type { GradesRepository } from "./grades.repository.js";

export class GradesService {
  constructor(
    readonly repository: GradesRepository,
    readonly events: EventBus,
  ) {}
}
