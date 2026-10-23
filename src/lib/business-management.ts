import { z } from "zod";

const text = z.string().trim().min(1).max(500);
export const profileSchema = z.object({
  id: z.string().uuid(), name: text, description: z.string().trim().max(5000),
  categoryCode: text, provinceId: z.string().uuid(), address: text,
  phone: z.string().trim().max(80), email: z.union([z.literal(""), z.string().email()]),
  website: z.union([z.literal(""), z.string().url().refine(v => /^https?:\/\//.test(v))]),
});
export const activityCategories = ["beach", "culture", "food", "nature", "community", "adventure"] as const;
export const activitySchema = z.object({
  id: z.string().uuid().optional(), businessId: z.string().uuid(),
  titlePt: text, titleEn: text, descriptionPt: z.string().trim().min(1).max(5000), descriptionEn: z.string().trim().min(1).max(5000),
  category: z.enum(activityCategories), priceMzn: z.number().finite().min(0),
  durationHours: z.number().finite().positive(), capacity: z.number().int().min(1).max(100),
  location: text, destinationId: z.string().uuid().nullable(), active: z.boolean(),
});
export const availabilitySchema = z.object({
  id: z.string().uuid().optional(), experienceId: z.string().uuid(), dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  capacity: z.number().int().min(1).max(100), active: z.boolean(),
}).refine(v => v.endTime > v.startTime, { message: "TIME_ORDER", path: ["endTime"] });
export type ProfileInput = z.infer<typeof profileSchema>;
export type ActivityInput = z.infer<typeof activitySchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;

export function managementError(error: unknown, pt: boolean) {
  const message = error instanceof Error ? error.message : "";
  if (/PROVINCE_HAS_ACTIVITIES/.test(message)) return pt ? "Este negócio já tem atividades. A mudança de província precisa de revisão para preservar os destinos associados." : "This business already has activities. Province changes need review to preserve linked destinations.";
  if (/EXISTING_BOOKINGS|CAPACITY_BELOW_BOOKED/.test(message)) return pt ? "Este horário tem reservas. Mantém as horas e lugares já reservados." : "This schedule has bookings. Keep its times and already booked seats.";
  if (/OVERLAPPING|unique_slot|duplicate key/.test(message)) return pt ? "Este horário coincide com outro existente." : "This schedule overlaps an existing one.";
  if (/FORBIDDEN|NOT_OWNED/.test(message)) return pt ? "Não tens autorização para esta alteração." : "You are not authorized to make this change.";
  if (/TIME_ORDER/.test(message)) return pt ? "A hora final deve ser posterior à inicial." : "End time must be later than start time.";
  if (error instanceof z.ZodError) return pt ? "Verifica os campos obrigatórios, contactos e valores numéricos." : "Check required fields, contact details and numeric values.";
  return pt ? "Não foi possível guardar. Tenta novamente." : "Could not save. Please try again.";
}