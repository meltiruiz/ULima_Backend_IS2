import type { db } from "../../db";

export class CurriculumRepository {
  constructor(readonly database: typeof db) {}
}
