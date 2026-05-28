import type { AlertsService } from "./alerts.service";

export class AlertsController {
  constructor(readonly service: AlertsService) {}
}
