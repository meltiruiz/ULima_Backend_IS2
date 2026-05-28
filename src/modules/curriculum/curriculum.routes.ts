import { Hono } from "hono";
import type { CurriculumController } from "./curriculum.controller";

export const createCurriculumRoutes = (_controller: CurriculumController) => new Hono();
