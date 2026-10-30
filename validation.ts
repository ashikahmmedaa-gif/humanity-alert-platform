import { z } from "zod";
import { CATEGORIES, LANGUAGES } from "./types";
export const reportSchema = z.object({
  title: z.string().trim().min(5).max(120),
  country: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(100),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  language: z.enum(LANGUAGES as [string, ...string[]]),
  details: z.string().trim().min(20).max(4000),
  anonymous: z.boolean()
});
