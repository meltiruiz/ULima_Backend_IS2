import { Hono } from "hono";
import type { SectionManagementController } from "./section-management.controller";

export const createSectionManagementRoutes = (_controller: SectionManagementController) => new Hono();
