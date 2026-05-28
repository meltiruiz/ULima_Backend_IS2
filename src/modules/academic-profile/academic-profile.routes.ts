import { Hono } from "hono";
import type { AcademicProfileController } from "./academic-profile.controller";

export const createAcademicProfileRoutes = (_controller: AcademicProfileController) => new Hono();
