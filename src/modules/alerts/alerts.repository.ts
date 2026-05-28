import type { db } from "../../db";

export class AlertsRepository {
  constructor(readonly database: typeof db) {}
}
