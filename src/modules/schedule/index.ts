import { db } from "../../db";
import { eventBus } from "../../events";
import { ScheduleController } from "./schedule.controller";
import { ScheduleRepository } from "./schedule.repository";
import { createScheduleRoutes } from "./schedule.routes";
import { ScheduleService } from "./schedule.service";

const scheduleRepository = new ScheduleRepository(db);
const scheduleService = new ScheduleService(scheduleRepository, eventBus);
const scheduleController = new ScheduleController(scheduleService);

export const scheduleRoutes = createScheduleRoutes(scheduleController);

export { ScheduleController } from "./schedule.controller";
export { ScheduleRepository } from "./schedule.repository";
export { ScheduleService } from "./schedule.service";
export { academicPeriodQuerySchema } from "./schedule.schemas";
export type { ScheduleView } from "./schedule.types";
