import { HERO_AVIF_SRCSET } from "@/components/HeroImage";

/**
 * Head of the public Home, shared by "/" (canonical) and "/home". Kept apart from the page
 * component so the route's critical chunk stays small.
 */
const TITLE = "EKAYA — Explora Moçambique para além da superfície";
const DESCRIPTION =
  "Escolhe destino, dias e tipo de experiência. EKAYA recomenda roteiros, atividades e locais únicos em Moçambique.";

/**
 * Structured data for search engines (Organization + WebSite). sameAs stays out until EKAYA has
 * social profiles with the same name (docs/SEO.md). Literal origin keeps app-info out of this chunk.
 */
const ORIGIN = "https://exploreekaya.com";
const JSON_LD = JSON.stringify([
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${ORIGIN}/#organization`,
    name: "EKAYA",
    alternateName: ["Explore EKAYA", "exploreekaya", "EKAYA Moçambique"],
    url: ORIGIN,
    logo: `${ORIGIN}/icon-512.png`,
    description: "Turismo comunitário em Moçambique: destinos, roteiros e experiências locais.",
    areaServed: { "@type": "Country", name: "Mozambique" },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${ORIGIN}/#website`,
    name: "EKAYA",
    alternateName: ["exploreekaya", "Explore Ekaya", "Ekaya Moçambique"],
    url: ORIGIN,
    inLanguage: ["pt", "en"],
    publisher: { "@id": `${ORIGIN}/#organization` },
  },
]);

export function homeHead() {
  return {
    scripts: [{ type: "application/ld+json", children: JSON_LD }],
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
