import type { EventBus } from "../../events";
import type { AlertsRepository } from "./alerts.repository";

export class AlertsService {
  constructor(
    readonly repository: AlertsRepository,
    readonly events: EventBus,
  ) {}
}
