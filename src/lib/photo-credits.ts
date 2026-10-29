/**
 * Photos bundled with the app (FOTOS-1): all from Wikimedia Commons under a free licence, approved
 * one by one. Each entry says what the photo shows, who took it and under which licence; the same
 * data feeds the small "©" credit on the photo and the /creditos page.
 * The files are cropped and resized for the app; CC BY-SA adaptations keep the same licence.
 */
import provGaza from "@/assets/prov-gaza.webp";
import provGazaThumb from "@/assets/prov-gaza-thumb.webp";
import provManica from "@/assets/prov-manica.webp";
import provManicaThumb from "@/assets/prov-manica-thumb.webp";
import provTete from "@/assets/prov-tete.webp";
import provTeteThumb from "@/assets/prov-tete-thumb.webp";
import provZambezia from "@/assets/prov-zambezia.webp";
import provZambeziaThumb from "@/assets/prov-zambezia-thumb.webp";
import provNiassa from "@/assets/prov-niassa.webp";
import provNiassaThumb from "@/assets/prov-niassa-thumb.webp";
import destMaputo from "@/assets/dest-maputo.webp";
import destMaputoThumb from "@/assets/dest-maputo-thumb.webp";
import destIlha from "@/assets/dest-ilha.webp";
import destIlhaThumb from "@/assets/dest-ilha-thumb.webp";
import destInhambane from "@/assets/dest-inhambane.webp";
import destInhambaneThumb from "@/assets/dest-inhambane-thumb.webp";
import destVilankulo from "@/assets/dest-vilankulo.webp";
import destVilankuloThumb from "@/assets/dest-vilankulo-thumb.webp";
import destPemba from "@/assets/dest-pemba.webp";
import destPembaThumb from "@/assets/dest-pemba-thumb.webp";
import destGorongosa from "@/assets/dest-gorongosa.webp";
import destGorongosaThumb from "@/assets/dest-gorongosa-thumb.webp";
import cultIndependencia from "@/assets/cult-independencia.webp";
import cultSamora from "@/assets/cult-samora.webp";
import cultFrelimo from "@/assets/cult-frelimo.webp";
import cultMarrabenta from "@/assets/cult-marrabenta.webp";

export interface PhotoCredit {
  id: string;
  /** Main file (card or header size). */
  src: string;
  /** Small version for lists, when there is one. */
  thumb?: string;
  shows: { pt: string; en: string };
  author: string;
  /** Licence name, or "public-domain" (shown translated). */
  license: string;
  licenseUrl?: string;
  /** Wikimedia Commons file page. */
  source: string;
}

const CC = (v: string) => `https://creativecommons.org/licenses/${v}/`;

export const PHOTOS = {
  "prov-gaza": {
    id: "prov-gaza",
    src: provGaza,
    thumb: provGazaThumb,
    shows: { pt: "Costa de Chongoene, Xai-Xai (Gaza)", en: "Chongoene coast, Xai-Xai (Gaza)" },
    author: "Heldo Luis Manhiça",
    license: "CC BY-SA 4.0",
    licenseUrl: CC("by-sa/4.0"),
    source: "https://commons.wikimedia.org/wiki/File:Chongoene_Xai-Xai,_Mozambique.jpg",
  },
  "prov-manica": {
    id: "prov-manica",
    src: provManica,
    thumb: provManicaThumb,
    shows: {
      pt: "Reserva Nacional de Chimanimani (Manica)",
      en: "Chimanimani National Reserve (Manica)",
    },
    author: "Ton Rulkens",
    license: "CC BY-SA 2.0",
    licenseUrl: CC("by-sa/2.0"),
    source: "https://commons.wikimedia.org/wiki/File:Chimanimani_landscape_7_(10246842503).jpg",
  },
  "prov-tete": {
    id: "prov-tete",
    src: provTete,
    thumb: provTeteThumb,
    shows: {
      pt: "Ponte Samora Machel sobre o Zambeze, Tete",
      en: "Samora Machel bridge over the Zambezi, Tete",
    },
    author: "Erik Cleves Kristensen",
    license: "CC BY 2.0",
    licenseUrl: CC("by/2.0"),
    source:
      "https://commons.wikimedia.org/wiki/File:Bridge_over_the_Zambezi_at_Tete,_Mozambique.jpg",
  },
  "prov-zambezia": {
    id: "prov-zambezia",
    src: provZambezia,
    thumb: provZambeziaThumb,
    shows: {
      pt: "Avenida Heróis da Liberdade, Quelimane (Zambézia)",
      en: "Avenida Heróis da Liberdade, Quelimane (Zambézia)",
    },
    author: "Cornelius Kibelka",
    license: "CC BY-SA 2.0",
    licenseUrl: CC("by-sa/2.0"),
    source: "https://commons.wikimedia.org/wiki/File:38_Ol%C3%A1,_Quelimane!_(37073180285).jpg",
  },
  "prov-niassa": {
    id: "prov-niassa",
    src: provNiassa,
    thumb: provNiassaThumb,
    shows: {
      pt: "Margem do Lago Niassa, Reserva do Lago Niassa",
      en: "Shore of Lake Niassa, Lake Niassa Reserve",
    },
    author: "USAID Africa Bureau",
    license: "public-domain",
    source: "https://commons.wikimedia.org/wiki/File:Lakeside_(5888439078).jpg",
  },
  "dest-maputo": {
    id: "dest-maputo",
    src: destMaputo,
    thumb: destMaputoThumb,
    shows: { pt: "Maputo vista da baía", en: "Maputo seen from the bay" },
    author: "Andrew Moir",
    license: "CC BY 2.0",
    licenseUrl: CC("by/2.0"),
    source:
      "https://commons.wikimedia.org/wiki/File:Maputo_skyline_from_cruiseship_East_Africa_-_Flickr_-_moron_noodle.jpg",
  },
  "dest-ilha": {
    id: "dest-ilha",
    src: destIlha,
    thumb: destIlhaThumb,
    shows: {
      pt: "Fortaleza de São Sebastião, Ilha de Moçambique",
      en: "Fort of São Sebastião, Island of Mozambique",
    },
    author: "Stig Nygaard",
    license: "CC BY 2.0",
    licenseUrl: CC("by/2.0"),
    source: "https://commons.wikimedia.org/wiki/File:Forte_de_S%C3%A3o_Sebasti%C3%A3o_-_Igreja.jpg",
  },
  "dest-inhambane": {
    id: "dest-inhambane",
    src: destInhambane,
    thumb: destInhambaneThumb,
    shows: { pt: "Praia de Guinjata, Inhambane", en: "Guinjata Beach, Inhambane" },
    author: "Bento Guirrugo",
    license: "CC BY-SA 4.0",
    licenseUrl: CC("by-sa/4.0"),
    source: "https://commons.wikimedia.org/wiki/File:Guinjata_Beach-_Inhambane_Mozambique.jpg",
  },
  "dest-vilankulo": {
    id: "dest-vilankulo",
    src: destVilankulo,
    thumb: destVilankuloThumb,
    shows: {
      pt: "Amanhecer em Vilankulo, com o arquipélago de Bazaruto",
      en: "Dawn in Vilankulo, with the Bazaruto Archipelago",
    },
    author: "Brian Dell",
    license: "public-domain",
    source:
      "https://commons.wikimedia.org/wiki/File:View_east_towards_a_Bazaruto_Archipelago_island.JPG",
  },
  "dest-pemba": {
    id: "dest-pemba",
    src: destPemba,
    thumb: destPembaThumb,
    shows: { pt: "Embondeiro na baía de Pemba", en: "Baobab on Pemba Bay" },
    author: "Ton Rulkens",
    license: "CC BY-SA 2.0",
    licenseUrl: CC("by-sa/2.0"),
    source:
      "https://commons.wikimedia.org/wiki/File:Adansonia_digitata_-_Pemba_Bay_(8153284444).jpg",
  },
  "dest-gorongosa": {
    id: "dest-gorongosa",
    src: destGorongosa,
    thumb: destGorongosaThumb,
    shows: {
      pt: "Monte Gorongosa, Parque Nacional da Gorongosa",
      en: "Mount Gorongosa, Gorongosa National Park",
    },
    author: "Judy Gallagher",
    license: "CC BY 2.0",
    licenseUrl: CC("by/2.0"),
    source:
      "https://commons.wikimedia.org/wiki/File:Mount_Gorongosa,_Gorongosa_National_Park,_Mozambique_(46316615492).jpg",
  },
  "cult-independencia": {
    id: "cult-independencia",
    src: cultIndependencia,
    shows: { pt: "Praça da Independência, Maputo", en: "Independence Square, Maputo" },
    author: "Salazar Sérgio",
    license: "CC BY-SA 4.0",
    licenseUrl: CC("by-sa/4.0"),
    source:
      "https://commons.wikimedia.org/wiki/File:Pra%C3%A7a_da_Independ%C3%AAncia,_Maputo_2025.jpg",
  },
  "cult-samora": {
    id: "cult-samora",
    src: cultSamora,
    shows: { pt: "Samora Machel", en: "Samora Machel" },
    author: "SRA James Simpson (U.S. Department of Defense)",
    license: "public-domain",
    source: "https://commons.wikimedia.org/wiki/File:Samora_Moises_Machel_DF-SC-88-01383.jpg",
  },
  "cult-frelimo": {
    id: "cult-frelimo",
    src: cultFrelimo,
    shows: {
      pt: "Praça dos Heróis Moçambicanos, Maputo",
      en: "Square of the Mozambican Heroes, Maputo",
    },
    author: "Paulo Ferreira",
    license: "CC BY-SA 4.0",
    licenseUrl: CC("by-sa/4.0"),
    source:
      "https://commons.wikimedia.org/wiki/File:Pra%C3%A7a_dos_Her%C3%B3is_Mo%C3%A7ambicanos_Maputo_1.JPG",
  },
  "cult-marrabenta": {
    id: "cult-marrabenta",
    src: cultMarrabenta,
    shows: {
      pt: "Festival da Marrabenta, Centro Cultural Franco-Moçambicano, Maputo",
      en: "Marrabenta Festival, Franco-Mozambican Cultural Centre, Maputo",
    },
    author: "Andrés Moreno",
    license: "CC BY-SA 2.0",
    licenseUrl: CC("by-sa/2.0"),
    source: "https://commons.wikimedia.org/wiki/File:Festival_da_Marrabenta_(5400568029).jpg",
  },
} satisfies Record<string, PhotoCredit>;

export type PhotoId = keyof typeof PHOTOS;

/** Province photo by province code (provinces.code): the 5 own photos, or the destination photo. */
const PROVINCE_PHOTO: Record<string, PhotoId> = {
  "maputo-cidade": "dest-maputo",
  maputo: "dest-maputo",
  gaza: "prov-gaza",
  inhambane: "dest-inhambane",
  sofala: "dest-gorongosa",
  manica: "prov-manica",
  tete: "prov-tete",
  zambezia: "prov-zambezia",
  nampula: "dest-ilha",
  niassa: "prov-niassa",
  "cabo-delgado": "dest-pemba",
};

export function provincePhoto(code: string | null | undefined): PhotoCredit | undefined {
  const id = code ? PROVINCE_PHOTO[code] : undefined;
  return id ? PHOTOS[id] : undefined;
}

/** Credit of a bundled photo from its URL (main or thumbnail), so any image can show its "©". */
export function creditFor(src: string | null | undefined): PhotoCredit | undefined {
  if (!src) return undefined;
  return Object.values(PHOTOS).find((p) => p.src === src || ("thumb" in p && p.thumb === src));
}

export function licenseLabel(license: string, lang: "pt" | "en"): string {
  if (license !== "public-domain") return license;
  return lang === "pt" ? "Domínio público" : "Public domain";
}

export const ALL_PHOTOS: PhotoCredit[] = Object.values(PHOTOS);
