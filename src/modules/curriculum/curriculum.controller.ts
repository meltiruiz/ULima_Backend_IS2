import type { CurriculumService } from "./curriculum.service";

export class CurriculumController {
  constructor(readonly service: CurriculumService) {}
}
