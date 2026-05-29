import type { AuthService } from "./auth.service";
import type { AppRole } from "./auth.types";

export class AuthController {
  constructor(readonly service: AuthService) {}

  login(input: { code: string; password: string }) {
    return this.service.login(input);
  }

  me(userId: number, role: AppRole) {
    return this.service.me(userId, role);
  }
}
