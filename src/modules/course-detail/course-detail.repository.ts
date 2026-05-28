import type { db } from "../../db";

export class CourseDetailRepository {
  constructor(readonly database: typeof db) {}
}
