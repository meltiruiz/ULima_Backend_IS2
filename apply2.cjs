const fs = require('fs');
let f = fs.readFileSync('src/modules/auth/auth.service.ts', 'utf8');
f = `import type { EventBus } from "../../events";
import type { AuthRepository } from "./auth.repository";
import { HttpError } from "../../shared/errors/http-error";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../../config/app-config";
import type { AppRole } from "./auth.types";

` + f.replace(/^import [\s\S]*?export class AuthService/m, 'export class AuthService');
fs.writeFileSync('src/modules/auth/auth.service.ts', f);
