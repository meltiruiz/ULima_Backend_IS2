import type { EventBus } from "../../events";
import type { GradesRepository } from "./grades.repository";

export class GradesService {
  constructor(
    readonly repository: GradesRepository,
    readonly events: EventBus,
  ) {}
}
