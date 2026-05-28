import { db } from "../../db";
import { eventBus } from "../../events";
import { AlertsController } from "./alerts.controller";
import { AlertsRepository } from "./alerts.repository";
import { createAlertsRoutes } from "./alerts.routes";
import { AlertsService } from "./alerts.service";

const alertsRepository = new AlertsRepository(db);
const alertsService = new AlertsService(alertsRepository, eventBus);
const alertsController = new AlertsController(alertsService);

export const alertsRoutes = createAlertsRoutes(alertsController);

export { AlertsController } from "./alerts.controller";
export { AlertsRepository } from "./alerts.repository";
export { AlertsService } from "./alerts.service";
export { markAlertReadSchema } from "./alerts.schemas";
export type { AlertType } from "./alerts.types";
