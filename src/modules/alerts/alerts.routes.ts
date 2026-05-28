import { Hono } from "hono";
import type { AlertsController } from "./alerts.controller";

export const createAlertsRoutes = (_controller: AlertsController) => new Hono();
