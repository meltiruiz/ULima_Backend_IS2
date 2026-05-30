import type { AlertsService } from "./alerts.service.js";

export class AlertsController {
  constructor(readonly service: AlertsService) {}
}
