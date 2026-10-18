import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { profileSchema, activitySchema, availabilitySchema } from "@/lib/business-management";

export const getBusinessManagement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: businesses, error } = await supabase.from("businesses").select("*").eq("owner_id", userId).order("created_at");
    if (error) throw new Error(error.message);
    const ids = (businesses ?? []).map(b => b.id);
    const [activities, availability, provinces, categories, destinations] = await Promise.all([
      supabase.from("experiences").select("*").in("business_id", ids),
      supabase.from("experience_availability").select("*, experiences!inner(business_id)").in("experiences.business_id", ids).order("day_of_week").order("start_time"),
      supabase.from("provinces").select("id, code, name_pt, name_en, active").order("name_pt"),
      supabase.from("business_categories").select("code, name_pt, name_en, active").order("sort_order"),
      supabase.from("destinations").select("id, name, province, province_id").order("name"),
    ]);
    for (const result of [activities, availability, provinces, categories, destinations]) if (result.error) throw new Error(result.error.message);
    return { businesses: businesses ?? [], activities: activities.data ?? [], availability: availability.data ?? [], provinces: provinces.data ?? [], categories: categories.data ?? [], destinations: destinations.data ?? [] };
  });

export const saveBusinessProfile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [business, province, category] = await Promise.all([
      supabase.from("businesses").select("id, contact, location").eq("id", data.id).eq("owner_id", userId).maybeSingle(),
      supabase.from("provinces").select("id, name_pt").eq("id", data.provinceId).eq("active", true).maybeSingle(),
      supabase.from("business_categories").select("code, name_pt").eq("code", data.categoryCode).eq("active", true).maybeSingle(),
    ]);
    if (!business.data || business.error) throw new Error("NOT_OWNED");
    if (!province.data || !category.data) throw new Error("INVALID_OPTIONS");
    const objectOf = (v: unknown): Record<string, string | number | boolean | null> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, string | number | boolean | null> : {};
    const { error } = await supabase.from("businesses").update({
      name: data.name, description: data.description, category_code: category.data.code, category: category.data.name_pt,
      province_id: province.data.id, province: province.data.name_pt,
      location: { ...objectOf(business.data.location), address: data.address },
      contact: { ...objectOf(business.data.contact), phone: data.phone, email: data.email, website: data.website },
    }).eq("id", data.id).eq("owner_id", userId).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveBusinessActivity = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => activitySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: business, error: businessError } = await supabase.from("businesses").select("id, province, province_id").eq("id", data.businessId).eq("owner_id", userId).maybeSingle();
    if (businessError || !business) throw new Error("NOT_OWNED");
    if (data.destinationId) {
      const { data: destination } = await supabase.from("destinations").select("id, province_id").eq("id", data.destinationId).maybeSingle();
      if (!destination || destination.province_id !== business.province_id) throw new Error("INVALID_DESTINATION");
    }
    const values = { business_id: business.id, title_pt: data.titlePt, title_en: data.titleEn, description_pt: data.descriptionPt, description_en: data.descriptionEn, category: data.category, price_mzn: data.priceMzn, duration_hours: data.durationHours, capacity: data.capacity, location: data.location, province: business.province, destination_id: data.destinationId, active: data.active };
    const result = data.id
      ? await supabase.from("experiences").update(values).eq("id", data.id).eq("business_id", business.id).select("id").single()
      : await supabase.from("experiences").insert(values).select("id").single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const saveBusinessAvailability = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => availabilitySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: activity } = await supabase.from("experiences").select("id, businesses!inner(owner_id)").eq("id", data.experienceId).eq("businesses.owner_id", userId).maybeSingle();
    if (!activity) throw new Error("NOT_OWNED");
    const values = { experience_id: activity.id, day_of_week: data.dayOfWeek, start_time: data.startTime, end_time: data.endTime, capacity: data.capacity, active: data.active };
    const result = data.id
      ? await supabase.from("experience_availability").update(values).eq("id", data.id).eq("experience_id", activity.id).select("id").single()
      : await supabase.from("experience_availability").insert(values).select("id").single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });