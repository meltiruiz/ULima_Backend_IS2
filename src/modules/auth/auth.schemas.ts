import { z } from "zod";

export const loginSchema = z.object({
  code: z.string().min(1),
  password: z.string().min(1),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(1),
});
