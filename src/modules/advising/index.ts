import { db } from "../../db/index.js";
import { eventBus } from "../../events/index.js";
import { AdvisingRepository } from "./advising.repository.js";
import { AdvisingService } from "./advising.service.js";
import { AdvisingController } from "./advising.controller.js";
import { createAdvisingRoutes } from "./advising.routes.js";

const advisingRepository = new AdvisingRepository(db);
const advisingService = new AdvisingService(advisingRepository, eventBus);
const advisingController = new AdvisingController(advisingService);

export const advisingRoutes = createAdvisingRoutes(advisingController);
export { AdvisingRepository, AdvisingService, AdvisingController };
export * from "./advising.types.js";
