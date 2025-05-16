import { z } from "zod";

export const botFormSchema = z.object({
  botName: z.string().min(3, "Bot name must be at least 3 characters long"),
  keys: z.record(z.string().optional()).optional(),
  config: z.any().optional(),
});

export type BotFormValues = z.infer<typeof botFormSchema>;
