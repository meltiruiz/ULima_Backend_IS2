import type { db } from "../../db";

export class AcademicProfileRepository {
  constructor(readonly database: typeof db) {}
}
