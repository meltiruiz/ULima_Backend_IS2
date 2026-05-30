import type { db } from "../../db/index.js";

export class SectionManagementRepository {
  constructor(readonly database: typeof db) {}
}
