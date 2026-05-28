import type { db } from "../../db";

export class GradesRepository {
  constructor(readonly database: typeof db) {}
}
