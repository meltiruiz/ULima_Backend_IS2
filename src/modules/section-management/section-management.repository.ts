import type { db } from "../../db";

export class SectionManagementRepository {
  constructor(readonly database: typeof db) {}
}
