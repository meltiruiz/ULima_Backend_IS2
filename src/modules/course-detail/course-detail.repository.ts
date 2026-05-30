import type { db } from "../../db/index.js";

export class CourseDetailRepository {
  constructor(readonly database: typeof db) {}
}
