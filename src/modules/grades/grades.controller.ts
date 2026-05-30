import type { GradesService } from "./grades.service.js";

export class GradesController {
  constructor(readonly service: GradesService) {}
}
