import { z } from "zod";

export const createAnnouncementSchema = z.object({
  sectionRepresentativeId: z.number().int().positive(),
  title: z.string().min(1).max(150),
  message: z.string().min(1),
});
