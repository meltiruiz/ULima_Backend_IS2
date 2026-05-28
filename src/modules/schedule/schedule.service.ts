import type { EventBus } from "../../events";
import type { ScheduleRepository } from "./schedule.repository";

export class ScheduleService {
  constructor(
    readonly repository: ScheduleRepository,
    readonly events: EventBus,
  ) {}
}
