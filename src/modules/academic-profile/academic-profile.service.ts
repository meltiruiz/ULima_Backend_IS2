import type { EventBus } from "../../events";
import type { AcademicProfileRepository } from "./academic-profile.repository";

export class AcademicProfileService {
  constructor(
    readonly repository: AcademicProfileRepository,
    readonly events: EventBus,
  ) {}
}
