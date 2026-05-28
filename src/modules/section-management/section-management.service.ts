import type { EventBus } from "../../events";
import type { SectionManagementRepository } from "./section-management.repository";

export class SectionManagementService {
  constructor(
    readonly repository: SectionManagementRepository,
    readonly events: EventBus,
  ) {}
}
