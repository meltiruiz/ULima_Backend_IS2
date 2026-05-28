import type { ScheduleService } from "./schedule.service";

export class ScheduleController {
  constructor(readonly service: ScheduleService) {}
}
