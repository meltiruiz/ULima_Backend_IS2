import type { db } from "../../db";

export class AuthRepository {
  constructor(readonly database: typeof db) {}
}
