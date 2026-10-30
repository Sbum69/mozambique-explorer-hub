import type { Lang } from "@/contexts/LanguageContext";
import { CONTENT_TXT } from "@/lib/page-texts";

/** Price of an activity: "Grátis"/"Free" when it is 0, otherwise "1 500 MZN" in the app language. */
export function formatPrice(mzn: number, lang: Lang): string {
  if (mzn === 0) return CONTENT_TXT[lang].free;
  return `${mzn.toLocaleString(lang === "pt" ? "pt-PT" : "en-GB")} MZN`;
}
