import { Hono } from "hono";
import type { ScheduleController } from "./schedule.controller";

export const createScheduleRoutes = (_controller: ScheduleController) => new Hono();
