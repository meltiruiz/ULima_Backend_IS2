import type { EventBus } from "../../events";
import type { CurriculumRepository } from "./curriculum.repository";

export class CurriculumService {
  constructor(
    readonly repository: CurriculumRepository,
    readonly events: EventBus,
  ) {}
}
