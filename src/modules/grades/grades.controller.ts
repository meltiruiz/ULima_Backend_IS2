import type { GradesService } from "./grades.service";

export class GradesController {
  constructor(readonly service: GradesService) {}
}
