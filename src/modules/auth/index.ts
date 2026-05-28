import { db } from "../../db";
import { eventBus } from "../../events";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { createAuthRoutes } from "./auth.routes";
import { AuthService } from "./auth.service";

const authRepository = new AuthRepository(db);
const authService = new AuthService(authRepository, eventBus);
const authController = new AuthController(authService);

export const authRoutes = createAuthRoutes(authController);

export { AuthController } from "./auth.controller";
export { AuthRepository } from "./auth.repository";
export { AuthService } from "./auth.service";
export { loginSchema } from "./auth.schemas";
export type { AppRole } from "./auth.types";
