import { db } from "../../db";
import { eventBus } from "../../events";
import { AcademicProfileController } from "./academic-profile.controller";
import { AcademicProfileRepository } from "./academic-profile.repository";
import { createAcademicProfileRoutes } from "./academic-profile.routes";
import { AcademicProfileService } from "./academic-profile.service";

const academicProfileRepository = new AcademicProfileRepository(db);
const academicProfileService = new AcademicProfileService(academicProfileRepository, eventBus);
const academicProfileController = new AcademicProfileController(academicProfileService);

export const academicProfileRoutes = createAcademicProfileRoutes(academicProfileController);

export { AcademicProfileController } from "./academic-profile.controller";
export { AcademicProfileRepository } from "./academic-profile.repository";
export { AcademicProfileService } from "./academic-profile.service";
export { selectCareerSchema, selectSpecialtiesSchema } from "./academic-profile.schemas";
export type { AcademicProfileStatus } from "./academic-profile.types";
