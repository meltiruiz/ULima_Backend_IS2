import type { EventBus } from "../../events/index.js";
import type { SectionManagementRepository } from "./section-management.repository.js";

export class SectionManagementService {
  constructor(
    readonly repository: SectionManagementRepository,
    readonly events: EventBus,
  ) {}
}
