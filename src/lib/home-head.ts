import { HERO_AVIF_SRCSET } from "@/components/HeroImage";

/**
 * Head of the public Home, shared by "/" (canonical) and "/home". Kept apart from the page
 * component so the route's critical chunk stays small.
 */
const TITLE = "EKAYA — Explora Moçambique para além da superfície";
const DESCRIPTION =
  "Escolhe destino, dias e tipo de experiência. EKAYA recomenda roteiros, atividades e locais únicos em Moçambique.";

export function homeHead() {
  return {
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
    // The hero photo is the largest element: start fetching it with the HTML, not after the JS.
    links: [
      {
        rel: "preload",
        as: "image",
        type: "image/avif",
        imageSrcSet: HERO_AVIF_SRCSET,
        imageSizes: "100vw",
        fetchPriority: "high" as const,
      },
    ],
  };
}
