import type { SectionManagementService } from "./section-management.service";

export class SectionManagementController {
  constructor(readonly service: SectionManagementService) {}
}
