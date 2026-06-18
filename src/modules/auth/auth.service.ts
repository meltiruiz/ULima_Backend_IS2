import type { EventBus } from "../../events/index.js";
import type { AuthRepository } from "./auth.repository.js";
import { HttpError } from "../../shared/errors/http-error.js";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { config } from "../../config/app-config.js";
import type { AppRole } from "./auth.types.js";

const googleClient = new OAuth2Client();

export class AuthService {
  constructor(
    readonly repository: AuthRepository,
    readonly events: EventBus,
  ) {}

  async login(input: { code: string; password: string }) {
    try {
      const user = await this.repository.findByCodeWithPassword(input.code);
      if (!user) throw new HttpError(401, "Código no encontrado en la base de datos.", "USER_NOT_FOUND");
      
      // Import bcrypt dynamically to avoid global dependency issues if needed, or use the top level import.
      // We will need to make sure bcrypt is imported at the top of the file.
      const bcrypt = await import("bcryptjs");
      const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
      if (!passwordMatches) throw new HttpError(401, "Contraseña incorrecta.", "INVALID_PASSWORD");

      const hasActiveEnrollment = await this.repository.hasActiveEnrollment(user.studentId);
      if (!hasActiveEnrollment) {
        throw new HttpError(403, "El estudiante no tiene una matrícula activa.", "NOT_ENROLLED");
      }

      const representation = await this.repository.findActiveRepresentation(user.studentId);
      const role = representation?.position ?? "student";
      const newTokenVersion = await this.repository.incrementTokenVersion(user.id);

      const safeUser = { ...user, tokenVersion: newTokenVersion };
      delete (safeUser as { passwordHash?: string }).passwordHash;
      const authenticatedUser = { ...safeUser, role };

      return {
        token: this.signToken({
          userId: authenticatedUser.id,
          studentId: authenticatedUser.studentId,
          code: authenticatedUser.code,
          role,
          tokenVersion: newTokenVersion,
        }),
        tokenType: "Bearer",
        expiresIn: config.auth.jwtExpiresIn,
        user: authenticatedUser,
      };
    } catch (e) {
      if (e instanceof HttpError) throw e;
      console.error('DB Error in auth.service login', e);
      throw new HttpError(500, "Error interno del servidor.", "INTERNAL_ERROR");
    }
  }

  async loginWithGoogle(input: { idToken: string }) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: input.idToken,
      });
      const payload = ticket.getPayload();
      
      if (!payload || !payload.email) {
        throw new HttpError(401, "Token de Google inválido.", "INVALID_TOKEN");
      }
      
      const email = payload.email;
      if (!email.endsWith("@aloe.ulima.edu.pe")) {
        throw new HttpError(403, "Debe usar un correo institucional (@aloe.ulima.edu.pe).", "INVALID_DOMAIN");
      }

      const user = await this.repository.findByEmail(email);
      if (!user) throw new HttpError(401, "Usuario no registrado en la base de datos.", "USER_NOT_FOUND");

      // Vincular la cuenta de Google: guarda el `sub` (ID único de Google) como google_id.
      if (payload.sub) {
        await this.repository.linkGoogleId(user.id, payload.sub);
      }

      const hasActiveEnrollment = await this.repository.hasActiveEnrollment(user.studentId);
      if (!hasActiveEnrollment) {
        throw new HttpError(403, "El estudiante no tiene una matrícula activa.", "NOT_ENROLLED");
      }

      const representation = await this.repository.findActiveRepresentation(user.studentId);
      const role = representation?.position ?? "student";
      const newTokenVersion = await this.repository.incrementTokenVersion(user.id);

      const authenticatedUser = { ...user, tokenVersion: newTokenVersion, role };

      return {
        token: this.signToken({
          userId: authenticatedUser.id,
          studentId: authenticatedUser.studentId,
          code: authenticatedUser.code,
          role,
          tokenVersion: newTokenVersion,
        }),
        tokenType: "Bearer",
        expiresIn: config.auth.jwtExpiresIn,
        user: authenticatedUser,
      };
    } catch (e) {
      if (e instanceof HttpError) throw e;
      console.error('DB Error in auth.service loginWithGoogle', e);
      throw new HttpError(500, "Error interno del servidor.", "INTERNAL_ERROR");
    }
  }

  async logout(userId: number) {
    try {
      await this.repository.incrementTokenVersion(userId);
    } catch (e) {
      console.error('DB Error in auth.service logout', e);
    }
  }

  async me(userId: number, role: AppRole) {
    try {
      const user = await this.repository.findById(userId, role);
      if (!user) throw new HttpError(404, "Usuario no encontrado.", "USER_NOT_FOUND");
      return { user };
    } catch (e) {
      if (e instanceof HttpError) throw e;
      console.error('DB Error in auth.service me', e);
      throw new HttpError(500, "Error interno del servidor.", "INTERNAL_ERROR");
    }
  }

  private signToken(input: { userId: number; studentId: number; code: string; role: AppRole; tokenVersion: number }) {
    return jwt.sign(
      {
        sub: input.userId,
        studentId: input.studentId,
        code: input.code,
        role: input.role,
        tokenVersion: input.tokenVersion,
      },
      config.auth.jwtSecret,
      {
        algorithm: "HS256",
        expiresIn: config.auth.jwtExpiresIn,
      },
    );
  }
}
