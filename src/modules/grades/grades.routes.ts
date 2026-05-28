import { Hono } from "hono";
import type { GradesController } from "./grades.controller";

export const createGradesRoutes = (_controller: GradesController) => new Hono();
