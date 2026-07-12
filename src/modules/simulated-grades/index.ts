import { db } from "../../db/index.js";
import { eventBus } from "../../events/index.js";
import { SimulatedGradesController } from "./simulated-grades.controller.js";
import { SimulatedGradesRepository } from "./simulated-grades.repository.js";
import { createSimulatedGradesRoutes } from "./simulated-grades.routes.js";
import { SimulatedGradesService } from "./simulated-grades.service.js";

const simulatedGradesRepository = new SimulatedGradesRepository(db);
const simulatedGradesService = new SimulatedGradesService(simulatedGradesRepository, eventBus);
const simulatedGradesController = new SimulatedGradesController(simulatedGradesService);

export const simulatedGradesRoutes = createSimulatedGradesRoutes(simulatedGradesController);

export { SimulatedGradesController } from "./simulated-grades.controller.js";
export { SimulatedGradesRepository } from "./simulated-grades.repository.js";
export { SimulatedGradesService } from "./simulated-grades.service.js";
