import type { SectionManagementService } from "./section-management.service.js";

export class SectionManagementController {
  constructor(readonly service: SectionManagementService) {}
}
