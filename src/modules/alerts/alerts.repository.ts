import type { db } from "../../db/index.js";

export class AlertsRepository {
  constructor(readonly database: typeof db) {}
}
