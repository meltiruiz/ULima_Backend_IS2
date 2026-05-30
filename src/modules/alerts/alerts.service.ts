import type { EventBus } from "../../events/index.js";
import type { AlertsRepository } from "./alerts.repository.js";

export class AlertsService {
  constructor(
    readonly repository: AlertsRepository,
    readonly events: EventBus,
  ) {}
}
