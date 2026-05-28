import { db } from "../../db";
import { eventBus } from "../../events";
import { SectionManagementController } from "./section-management.controller";
import { SectionManagementRepository } from "./section-management.repository";
import { createSectionManagementRoutes } from "./section-management.routes";
import { SectionManagementService } from "./section-management.service";

const sectionManagementRepository = new SectionManagementRepository(db);
const sectionManagementService = new SectionManagementService(sectionManagementRepository, eventBus);
const sectionManagementController = new SectionManagementController(sectionManagementService);

export const sectionManagementRoutes = createSectionManagementRoutes(sectionManagementController);

export { SectionManagementController } from "./section-management.controller";
export { SectionManagementRepository } from "./section-management.repository";
export { SectionManagementService } from "./section-management.service";
export { createAnnouncementSchema } from "./section-management.schemas";
export type { RepresentativePosition } from "./section-management.types";
