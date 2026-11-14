import { supabase } from "@/integrations/supabase/client";

/**
 * First-entry guide of the panels. Each step points at a real element of the page
 * (data-guide="<target>"); steps whose element is not on screen are left out.
 * The account remembers the outcome in the database (profiles.guide_*, 0068), never in localStorage.
 */
export type GuideRole = "tourist" | "business";
export type GuideOutcome = "completed" | "skipped" | "dismissed";

export interface GuideStep {
  target: string;
  title: { pt: string; en: string };
  body: { pt: string; en: string };
}

export const GUIDE_STEPS: Record<GuideRole, GuideStep[]> = {
  tourist: [
    {
      target: "prefs",
      title: { pt: "Escolhe as tuas preferências", en: "Choose your preferences" },
      body: {
        pt: "Destino, dias e interesses: é com isto que o EKAYA te recomenda roteiros.",
        en: "Destination, days and interests: this is what EKAYA uses to recommend itineraries.",
      },
    },
    {
      target: "reco",
      title: { pt: "Vê as recomendações", en: "See your recommendations" },
      body: {
        pt: "Aqui aparece o roteiro oficial que mais combina contigo.",
        en: "The official itinerary that best matches you shows up here.",
      },
    },
    {
      target: "routes",
      title: { pt: "Segue um roteiro", en: "Follow an itinerary" },
      body: {
        pt: "Começa um roteiro e conclui cada paragem com uma fotografia.",
        en: "Start an itinerary and complete each stop with a photo.",
      },
    },
    {
      target: "points",
      title: { pt: "Jogos, pontos e recompensas", en: "Games, points and rewards" },
      body: {
        pt: "Ganhas pontos com paragens, jogos e quizzes, e trocas-os por recompensas.",
        en: "Earn points from stops, games and quizzes, and redeem them for rewards.",
      },
    },
    {
      target: "book",
      title: { pt: "Reserva uma experiência", en: "Book an experience" },
      body: {
        pt: "Atividades de negócios locais, com o preço e a disponibilidade de cada uma.",
        en: "Activities by local businesses, each with its price and availability.",
      },
    },
  ],
  business: [
    {
      target: "biz-profile",
      title: { pt: "Completa o perfil", en: "Complete your profile" },
      body: {
        pt: "Nome, contactos, fotografias e localização: é o que os viajantes veem.",
        en: "Name, contacts, photos and location: this is what travellers see.",
      },
    },
    {
      target: "biz-create",
      title: { pt: "Cria uma experiência", en: "Create an experience" },
      body: {
        pt: "Descreve a atividade, o preço e os horários. Fica pública depois da aprovação.",
        en: "Describe the activity, price and times. It goes public once approved.",
      },
    },
    {
      target: "biz-bookings",
      title: { pt: "Vê as reservas", en: "See your bookings" },
      body: {
        pt: "Os pedidos dos viajantes chegam aqui: confirma ou recusa cada um.",
        en: "Travellers' requests arrive here: confirm or decline each one.",
      },
    },
    {
      target: "biz-rewards",
      title: { pt: "Cria uma recompensa", en: "Create a reward" },
      body: {
        pt: "Oferece algo em troca de pontos e traz viajantes ao teu negócio.",
        en: "Offer something in exchange for points and bring travellers to your business.",
      },
    },
  ],
};

/** "Ver o guia outra vez" (Help menu) asks the open panel to show its guide. */
export const OPEN_GUIDE_EVENT = "ekaya:open-guide";

/** Outcome saved for this account, or null when the guide was never finished or skipped. */
export async function fetchGuideOutcome(
  userId: string,
  role: GuideRole,
): Promise<GuideOutcome | null> {
  const column = role === "tourist" ? "guide_tourist" : "guide_business";
  const { data, error } = await supabase
    .from("profiles")
    .select(column)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return ((data as Record<string, GuideOutcome | null> | null)?.[column] ??
    null) as GuideOutcome | null;
}

export async function saveGuideOutcome(role: GuideRole, outcome: GuideOutcome) {
  // set_my_guide comes with migration 0068 (types.ts is updated once it is approved and applied).
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: "set_my_guide",
    args: { _guide: GuideRole; _status: GuideOutcome },
  ) => Promise<{ error: { message: string } | null }>;
  const { error } = await rpc("set_my_guide", { _guide: role, _status: outcome });
  if (error) throw new Error(error.message);
}
