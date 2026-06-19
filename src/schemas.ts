import { z } from "zod";

export const PackageSchema = z.object({
  name: z.enum(["basic", "standard", "premium"]),
  price: z.number().positive(),
  deliveryDays: z.number().int().positive(),
});

const FaqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const LanguageSchema = z.object({
  lang: z.string().min(1),
  level: z.enum(["basic", "conversational", "fluent", "native"]),
});

export const UpdateProfileSchema = z.object({
  displayName: z.string().optional(),
  professionalTitle: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  languages: z.array(LanguageSchema).optional(),
});

const GigFieldsSchema = z.object({
  title: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).max(5).optional(),
  packages: z.array(PackageSchema).optional(),
  faq: z.array(FaqSchema).optional(),
  requirements: z.array(z.string()).optional(),
});

export const CreateGigSchema = GigFieldsSchema.required({ title: true });
export const UpdateGigSchema = GigFieldsSchema;

export const GigIdSchema = z.object({ gigId: z.string().min(1) });

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type CreateGigInput = z.infer<typeof CreateGigSchema>;
export type UpdateGigInput = z.infer<typeof UpdateGigSchema>;
export type GigIdInput = z.infer<typeof GigIdSchema>;
