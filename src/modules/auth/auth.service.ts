import type { EventBus } from "../../events";
import type { AuthRepository } from "./auth.repository";
import { HttpError } from "../../shared/errors/http-error";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../../config/app-config";
import type { AppRole } from "./auth.types";

export class AuthService {
  constructor(
    readonly repository: AuthRepository,
    readonly events: EventBus,
  ) {}

  async login(input: { code: string; password: string }) {
    const user = await this.repository.findByCodeWithPassword(input.code);
    if (!user) throw new HttpError(401, "Código no encontrado en la base de datos.", "USER_NOT_FOUND");
    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) throw new HttpError(401, "Contraseña incorrecta.", "INVALID_PASSWORD");

    const hasActiveEnrollment = await this.repository.hasActiveEnrollment(user.studentId);
    if (!hasActiveEnrollment) {
      throw new HttpError(403, "El estudiante no tiene una matrícula activa.", "NOT_ENROLLED");
    }

    const representation = await this.repository.findActiveRepresentation(user.studentId);
    const role = representation?.position ?? "student";
    const safeUser = { ...user };
    delete (safeUser as { passwordHash?: string }).passwordHash;
    const authenticatedUser = { ...safeUser, role };

    return {
      token: this.signToken({
        userId: authenticatedUser.id,
        studentId: authenticatedUser.studentId,
        code: authenticatedUser.code,
        role,
      }),
      tokenType: "Bearer",
      expiresIn: config.auth.jwtExpiresIn,
      user: authenticatedUser,
    };
  }

  async me(userId: number, role: AppRole) {
    const user = await this.repository.findById(userId, role);
    if (!user) throw new HttpError(404, "Usuario no encontrado.", "USER_NOT_FOUND");
    return { user };
  }

  private signToken(input: { userId: number; studentId: number; code: string; role: AppRole }) {
    return jwt.sign(
      {
        sub: input.userId,
        studentId: input.studentId,
        code: input.code,
        role: input.role,
      },
      config.auth.jwtSecret,
      {
        algorithm: "HS256",
        expiresIn: config.auth.jwtExpiresIn,
      },
    );
  }
}
