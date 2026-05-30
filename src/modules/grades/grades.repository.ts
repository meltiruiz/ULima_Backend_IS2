import type { db } from "../../db/index.js";

export class GradesRepository {
  constructor(readonly database: typeof db) {}
}
