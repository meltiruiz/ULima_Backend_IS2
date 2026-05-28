import { db } from "../../db";
import { eventBus } from "../../events";
import { GradesController } from "./grades.controller";
import { GradesRepository } from "./grades.repository";
import { createGradesRoutes } from "./grades.routes";
import { GradesService } from "./grades.service";

const gradesRepository = new GradesRepository(db);
const gradesService = new GradesService(gradesRepository, eventBus);
const gradesController = new GradesController(gradesService);

export const gradesRoutes = createGradesRoutes(gradesController);

export { GradesController } from "./grades.controller";
export { GradesRepository } from "./grades.repository";
export { GradesService } from "./grades.service";
export { upsertStudentScoreSchema } from "./grades.schemas";
export type { GradeValue } from "./grades.types";
