import type { EventBus } from "../../events";
import type { AcademicProfileRepository } from "./academic-profile.repository";
import { HttpError } from "../../shared/errors/http-error";

export class AcademicProfileService {
  constructor(
    readonly repository: AcademicProfileRepository,
    readonly events: EventBus,
  ) {}

  async getProfile(userId: number, role: string) {
    const profile = await this.repository.findProfileByUserId(userId);
    if (!profile) {
      throw new HttpError(404, "Usuario no encontrado.", "USER_NOT_FOUND");
    }

    const specialties = await this.repository.findActiveSpecialties(profile.student_id);

    return {
      profile: {
        id: Number(profile.user_id),
        studentId: Number(profile.student_id),
        code: profile.code,
        fullName: profile.fullName,
        institutionalEmail: profile.institutionalEmail,
        role: role,
        currentLevel: profile.currentLevel == null ? null : Number(profile.currentLevel),
        career: {
          id: Number(profile.career_id),
          code: profile.career_code,
          name: profile.career_name,
          faculty: profile.career_faculty,
        },
        curriculum: {
          id: Number(profile.curriculum_id),
          name: profile.curriculum_name,
        },
        specialties: specialties.map(s => ({
          specialtyId: Number(s.specialtyId),
          name: s.name,
          selectionType: s.selectionType,
        })),
      },
    };
  }

  async getCareers() {
    const careers = await this.repository.findAllCareers();
    return {
      careers: careers.map(c => ({
        id: Number(c.id),
        code: c.code,
        name: c.name,
        faculty: c.faculty,
      })),
    };
  }

  async getSpecialties(userId: number, careerId?: number) {
    let targetCareerId = careerId;
    if (!targetCareerId) {
      const profile = await this.repository.findProfileByUserId(userId);
      if (!profile) {
        throw new HttpError(404, "Usuario no encontrado.", "USER_NOT_FOUND");
      }
      targetCareerId = Number(profile.career_id);
    }

    const specialties = await this.repository.findSpecialtiesByCareerId(targetCareerId);
    return {
      specialties: specialties.map(s => ({
        id: Number(s.id),
        careerId: Number(s.careerId),
        name: s.name,
        description: s.description,
      })),
    };
  }

  async updateSpecialties(userId: number, input: { primarySpecialtyId?: number | null; interestSpecialtyIds?: number[] }) {
    const profile = await this.repository.findProfileByUserId(userId);
    if (!profile) {
      throw new HttpError(404, "Usuario no encontrado.", "USER_NOT_FOUND");
    }

    const studentId = Number(profile.student_id);

    // Validate primarySpecialtyId
    if (input.primarySpecialtyId) {
      const exists = await this.repository.specialtyExists(input.primarySpecialtyId);
      if (!exists) {
        throw new HttpError(404, "Especialidad principal no encontrada.", "SPECIALTY_NOT_FOUND");
      }
    }

    // Validate interestSpecialtyIds
    const interestIds = input.interestSpecialtyIds ?? [];
    for (const id of interestIds) {
      const exists = await this.repository.specialtyExists(id);
      if (!exists) {
        throw new HttpError(404, `Especialidad de interés con ID ${id} no encontrada.`, "SPECIALTY_NOT_FOUND");
      }
    }

    // Check if primary is also in interest list to avoid conflict
    if (input.primarySpecialtyId && interestIds.includes(input.primarySpecialtyId)) {
      throw new HttpError(400, "La especialidad principal no puede estar también en la lista de interés.", "INVALID_BODY");
    }

    // Deactivate all specialties for the student
    await this.repository.deactivateAllStudentSpecialties(studentId);

    // Upsert primary specialty
    if (input.primarySpecialtyId) {
      await this.repository.upsertStudentSpecialty(studentId, input.primarySpecialtyId, "primary");
    }

    // Upsert interest specialties
    for (const id of interestIds) {
      await this.repository.upsertStudentSpecialty(studentId, id, "interest");
    }

    // Return the new active specialties
    const specialties = await this.repository.findActiveSpecialties(studentId);
    return {
      message: "Specialties updated",
      specialties: specialties.map(s => ({
        specialtyId: Number(s.specialtyId),
        selectionType: s.selectionType,
      })),
    };
  }
}
