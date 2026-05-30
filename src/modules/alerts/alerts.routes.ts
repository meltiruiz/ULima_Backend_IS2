import { Hono } from "hono";
import type { AlertsController } from "./alerts.controller.js";

export const createAlertsRoutes = (_controller: AlertsController) => new Hono();
