import type { db } from "../../db";

export class ScheduleRepository {
  constructor(readonly database: typeof db) {}
}
