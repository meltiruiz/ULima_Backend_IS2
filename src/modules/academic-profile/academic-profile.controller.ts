import type { AcademicProfileService } from "./academic-profile.service";

export class AcademicProfileController {
  constructor(readonly service: AcademicProfileService) {}
}
