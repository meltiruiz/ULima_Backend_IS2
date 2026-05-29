import { db } from "../../db";
import { eventBus } from "../../events";
import { CurriculumController } from "./curriculum.controller";
import { CurriculumRepository } from "./curriculum.repository";
import { createCurriculumRoutes } from "./curriculum.routes";
import { CurriculumService } from "./curriculum.service";

const curriculumRepository = new CurriculumRepository(db);
const curriculumService = new CurriculumService(curriculumRepository, eventBus);
const curriculumController = new CurriculumController(curriculumService);

export const curriculumRoutes = createCurriculumRoutes(curriculumController);

export { CurriculumController } from "./curriculum.controller";
export { CurriculumRepository } from "./curriculum.repository";
export { CurriculumService } from "./curriculum.service";
export { updateCourseProgressSchema, updateSimulationSchema } from "./curriculum.schemas";
export type { CourseProgressStatus } from "./curriculum.types";
