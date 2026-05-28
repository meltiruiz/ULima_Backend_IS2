import type { AuthService } from "./auth.service";

export class AuthController {
  constructor(readonly service: AuthService) {}

  login(input: { code: string; password: string }) {
    return this.service.login(input);
  }

  me(code: string) {
    return this.service.me(code);
  }
}
