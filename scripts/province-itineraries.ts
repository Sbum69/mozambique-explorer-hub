/**
 * Curated itineraries by province (Bloco A), from verified places only (docs/data/roteiros-exemplo.md).
 * Usage: bun scripts/province-itineraries.ts > out.sql   (prints one SQL DO block; applied through
 * the Lovable connector after approval). Coordinates come from OpenStreetMap (the object link is the
 * stop's source); travel times and seasons stay "a confirmar" (null). Not part of the app bundle.
 */
type Place = {
  kind: "place";
  pt: string;
  en: string;
  dpt: string;
  den: string;
  loc: string;
  lat: number;
  lng: number;
  osm: string;
};
type Dest = { kind: "dest"; slug: string };
type Travel = { kind: "travel"; pt: string; en: string };
type Stop = Place | Dest | Travel;
type Day = { pt: string; en: string; stops: Stop[] };
type Route = {
  code: string;
  province: string;
  provinces?: string[];
  titlePt: string;
  titleEn: string;
  descPt: string;
  descEn: string;
  interests: string[];
  intensity: "low" | "medium" | "high";
  suggestionsPt: string;
  suggestionsEn: string;
  days: Day[];
};

const OSM = "https://www.openstreetmap.org/";
const P = (
  pt: string,
  en: string,
  dpt: string,
  den: string,
  loc: string,
  lat: number,
  lng: number,
  osm: string,
): Place => ({ kind: "place", pt, en, dpt, den, loc, lat, lng, osm: OSM + osm });
const T = (pt: string, en: string): Travel => ({ kind: "travel", pt, en });
const D = (slug: string): Dest => ({ kind: "dest", slug });

const FORTALEZA_ILHA = P(
  "Fortaleza de São Sebastião",
  "Fort of São Sebastião",
  "Fortaleza iniciada em 1558, na ponta norte da Ilha de Moçambique.",
  "Fort begun in 1558, at the northern tip of Mozambique Island.",
  "Ilha de Moçambique",
  -15.0287,
  40.7436,
  "way/206235094",
);
const PALACIO = P(
  "Palácio de São Paulo",
  "Palace of São Paulo",
  "Palácio na Cidade de Pedra e Cal da Ilha de Moçambique.",
  "Palace in the Stone Town of Mozambique Island.",
  "Ilha de Moçambique",
  -15.0315,
  40.7373,
  "relation/9445009",
);
const MUSEU_NPL = P(
  "Museu Nacional de Etnologia",
  "National Museum of Ethnology",
  "Museu na cidade de Nampula.",
  "Museum in the city of Nampula.",
  "Nampula",
  -15.118,
  39.2665,
  "way/511493693",
);
const MOSSURIL = P(
  "Baía de Mossuril",
  "Mossuril Bay",
  "Baía junto à Ilha de Moçambique.",
  "Bay next to Mozambique Island.",
  "Mossuril",
  -15.0207,
  40.7187,
  "node/2544717276",
);
const CHOCAS = P(
  "Chocas-Mar",
  "Chocas-Mar",
  "Povoação costeira no distrito de Mossuril.",
  "Coastal village in Mossuril district.",
  "Mossuril",
  -14.9427,
  40.7382,
  "node/617649584",
);

const NOTE_PT = (s: string) =>
  `Sugestões (não reserváveis): ${s}. Tempos de viagem e época recomendada: a confirmar.`;
const NOTE_EN = (s: string) =>
  `Suggestions (not bookable): ${s}. Travel times and best season: to be confirmed.`;

export const ROUTES: Route[] = [
  {
    code: "EK-MAN-002",
    province: "manica",
    intensity: "high",
    interests: ["nature", "hiking", "local_life"],
    titlePt: "Manica: das cidades às montanhas de Chimanimani",
    titleEn: "Manica: from the towns to the Chimanimani mountains",
    descPt:
      "Chimoio e Manica, e depois o distrito de Sussundenga e o Monte Binga, o ponto mais alto de Moçambique.",
    descEn:
      "Chimoio and Manica, then Sussundenga district and Mount Binga, Mozambique's highest point.",
    suggestionsPt:
      "caminhada, observação de aves, observação de paisagens; subir ao Monte Binga exige guia e preparação",
    suggestionsEn:
      "walking, bird watching, viewpoints; climbing Mount Binga needs a guide and preparation",
    days: [
      {
        pt: "Chimoio",
        en: "Chimoio",
        stops: [
          P(
            "Chimoio",
            "Chimoio",
            "Capital da província de Manica.",
            "Capital of Manica province.",
            "Chimoio",
            -19.1437,
            33.478,
            "relation/11589176",
          ),
        ],
      },
      {
        pt: "Manica",
        en: "Manica",
        stops: [
          P(
            "Manica",
            "Manica",
            "Cidade perto da fronteira com o Zimbabwe.",
            "Town near the Zimbabwe border.",
            "Manica",
            -18.9367,
            32.876,
            "node/1419408735",
          ),
        ],
      },
      {
        pt: "Sussundenga",
        en: "Sussundenga",
        stops: [
          T("Deslocação Manica → Sussundenga", "Travel Manica → Sussundenga"),
          P(
            "Sussundenga",
            "Sussundenga",
            "Sede do distrito onde fica o Parque Nacional de Chimanimani.",
            "Seat of the district of Chimanimani National Park.",
            "Sussundenga",
            -19.4132,
            33.2929,
            "node/2281184283",
          ),
        ],
      },
      {
        pt: "Monte Binga",
        en: "Mount Binga",
        stops: [
          P(
            "Monte Binga",
            "Mount Binga",
            "O ponto mais alto de Moçambique (2 436 m), no Parque Nacional de Chimanimani.",
            "Mozambique's highest point (2,436 m), in Chimanimani National Park.",
            "Sussundenga",
            -19.7762,
            33.0626,
            "node/348205650",
          ),
        ],
      },
      {
        pt: "Rio Mussapa",
        en: "Mussapa River",
        stops: [
          P(
            "Rio Mussapa",
            "Mussapa River",
            "Rio no distrito de Sussundenga.",
            "River in Sussundenga district.",
            "Sussundenga",
            -19.9711,
            33.2689,
            "way/230149954",
          ),
        ],
      },
      {
        pt: "Regresso",
        en: "Return",
        stops: [T("Deslocação Sussundenga → Chimoio", "Travel Sussundenga → Chimoio")],
      },
    ],
  },
  {
    code: "EK-ZAM-002",
    province: "zambezia",
    intensity: "medium",
    interests: ["culture", "nature", "local_life"],
    titlePt: "Zambézia: Quelimane e as plantações do Gurúè",
    titleEn: "Zambézia: Quelimane and the Gurúè tea estates",
    descPt: "Da capital da Zambézia ao planalto do Gurúè e ao Monte Namuli.",
    descEn: "From the capital of Zambézia to the Gurúè highlands and Mount Namuli.",
    suggestionsPt: "caminhada, observação de paisagens de florestas",
    suggestionsEn: "walking, forest viewpoints",
    days: [
      {
        pt: "Quelimane",
        en: "Quelimane",
        stops: [
          P(
            "Quelimane",
            "Quelimane",
            "Capital da província da Zambézia.",
            "Capital of Zambézia province.",
            "Quelimane",
            -17.8775,
            36.8902,
            "node/259593870",
          ),
        ],
      },
      {
        pt: "Gurúè",
        en: "Gurúè",
        stops: [
          T("Deslocação Quelimane → Mocuba → Gurúè", "Travel Quelimane → Mocuba → Gurúè"),
          P(
            "Gurúè",
            "Gurúè",
            "Cidade do planalto, conhecida pelas plantações de chá.",
            "Highland town known for its tea estates.",
            "Gurúè",
            -15.4651,
            36.9875,
            "node/335170812",
          ),
        ],
      },
      {
        pt: "Monte Namuli",
        en: "Mount Namuli",
        stops: [
          P(
            "Monte Namuli",
            "Mount Namuli",
            "Um dos pontos mais altos de Moçambique, no distrito do Gurúè.",
            "One of Mozambique's highest points, in Gurúè district.",
            "Gurúè",
            -15.3568,
            37.0598,
            "node/335172051",
          ),
        ],
      },
      {
        pt: "Regresso",
        en: "Return",
        stops: [T("Deslocação Gurúè → Quelimane", "Travel Gurúè → Quelimane")],
      },
    ],
  },
  {
    code: "EK-TET-003",
    province: "tete",
    intensity: "low",
    interests: ["culture", "nature"],
    titlePt: "Tete: a cidade do Zambeze e Cahora Bassa",
    titleEn: "Tete: the Zambezi city and Cahora Bassa",
    descPt: "A ponte sobre o Zambeze em Tete e a vila do Songo, junto à barragem de Cahora Bassa.",
    descEn: "The bridge over the Zambezi in Tete and the town of Songo, by the Cahora Bassa dam.",
    suggestionsPt: "observação de paisagens ribeirinhas",
    suggestionsEn: "riverside viewpoints",
    days: [
      {
        pt: "Cidade de Tete",
        en: "Tete city",
        stops: [
          P(
            "Ponte Samora Machel",
            "Samora Machel Bridge",
            "Ponte sobre o rio Zambeze, na cidade de Tete.",
            "Bridge over the Zambezi River, in Tete city.",
            "Tete",
            -16.1548,
            33.5938,
            "way/44077739",
          ),
        ],
      },
      {
        pt: "Songo",
        en: "Songo",
        stops: [
          T("Deslocação Tete → Songo", "Travel Tete → Songo"),
          P(
            "Songo",
            "Songo",
            "Vila junto à barragem de Cahora Bassa.",
            "Town by the Cahora Bassa dam.",
            "Cahora-Bassa",
            -15.5951,
            32.775,
            "node/1423065191",
          ),
        ],
      },
    ],
  },
  {
    code: "EK-NIA-002",
    province: "niassa",
    intensity: "medium",
    interests: ["nature", "local_life"],
    titlePt: "Niassa: Lichinga e o Lago Niassa",
    titleEn: "Niassa: Lichinga and Lake Niassa",
    descPt: "Da capital do Niassa às povoações da margem moçambicana do lago.",
    descEn: "From the capital of Niassa to the villages on the Mozambican shore of the lake.",
    suggestionsPt: "observação de aves aquáticas",
    suggestionsEn: "waterbird watching",
    days: [
      {
        pt: "Lichinga",
        en: "Lichinga",
        stops: [
          P(
            "Lichinga",
            "Lichinga",
            "Capital da província do Niassa.",
            "Capital of Niassa province.",
            "Lichinga",
            -13.2999,
            35.2459,
            "node/335126704",
          ),
        ],
      },
      {
        pt: "Metangula",
        en: "Metangula",
        stops: [
          T("Deslocação Lichinga → Metangula", "Travel Lichinga → Metangula"),
          P(
            "Metangula",
            "Metangula",
            "Vila na margem do Lago Niassa.",
            "Town on the shore of Lake Niassa.",
            "Lago",
            -12.6961,
            34.8183,
            "node/1426191717",
          ),
        ],
      },
      {
        pt: "Cóbuè",
        en: "Cóbuè",
        stops: [
          P(
            "Cóbuè",
            "Cóbuè",
            "Povoação na margem moçambicana do Lago Niassa.",
            "Village on the Mozambican shore of Lake Niassa.",
            "Lago",
            -12.0411,
            35.0144,
            "relation/17227895",
          ),
        ],
      },
      {
        pt: "Regresso",
        en: "Return",
        stops: [T("Deslocação Cóbuè → Lichinga", "Travel Cóbuè → Lichinga")],
      },
    ],
  },
  {
    code: "EK-SUL-001",
    province: "maputo-cidade",
    provinces: ["maputo-cidade", "gaza", "inhambane"],
    intensity: "low",
    interests: ["beach", "culture", "local_life"],
    titlePt: "Sul de Moçambique: de Maputo a Vilankulo",
    titleEn: "Southern Mozambique: from Maputo to Vilankulo",
    descPt:
      "Sete dias pela costa sul: Maputo, Bilene, Xai-Xai, Inhambane e o Tofo, Vilankulo e o Bazaruto.",
    descEn:
      "Seven days along the southern coast: Maputo, Bilene, Xai-Xai, Inhambane and Tofo, Vilankulo and Bazaruto.",
    suggestionsPt: "provar matapa com camarão, visita às praias, observação de fauna marinha",
    suggestionsEn: "tasting matapa with prawns, beaches, marine wildlife",
    days: [
      {
        pt: "Maputo",
        en: "Maputo",
        stops: [
          P(
            "Fortaleza de Maputo",
            "Maputo Fortress",
            "Fortaleza no centro histórico de Maputo.",
            "Fortress in Maputo's historic centre.",
            "Maputo",
            -25.9751,
            32.5707,
            "way/81244527",
          ),
          P(
            "Mercado Central",
            "Central Market",
            "Mercado municipal no centro de Maputo.",
            "Municipal market in central Maputo.",
            "Maputo",
            -25.9707,
            32.5689,
            "way/242924493",
          ),
        ],
      },
      {
        pt: "Bilene",
        en: "Bilene",
        stops: [
          T("Deslocação Maputo → Bilene", "Travel Maputo → Bilene"),
          P(
            "Lagoa Uembje",
            "Uembje Lagoon",
            "Lagoa da Praia do Bilene.",
            "The lagoon of Bilene beach.",
            "Bilene",
            -25.2836,
            33.275,
            "relation/3369134",
          ),
        ],
      },
      {
        pt: "Xai-Xai",
        en: "Xai-Xai",
        stops: [
          P(
            "Xai-Xai",
            "Xai-Xai",
            "Capital da província de Gaza.",
            "Capital of Gaza province.",
            "Xai-Xai",
            -25.0445,
            33.6407,
            "node/335077559",
          ),
        ],
      },
      {
        pt: "Inhambane",
        en: "Inhambane",
        stops: [
          T("Deslocação Xai-Xai → Inhambane", "Travel Xai-Xai → Inhambane"),
          P(
            "Cidade de Inhambane",
            "Inhambane city",
            "Capital da província de Inhambane.",
            "Capital of Inhambane province.",
            "Inhambane",
            -23.866,
            35.3844,
            "relation/11623616",
          ),
        ],
      },
      { pt: "Tofo", en: "Tofo", stops: [D("inhambane")] },
      {
        pt: "Vilankulo",
        en: "Vilankulo",
        stops: [
          T("Deslocação Inhambane → Vilankulo", "Travel Inhambane → Vilankulo"),
          D("vilankulo"),
        ],
      },
      {
        pt: "Bazaruto",
        en: "Bazaruto",
        stops: [
          P(
            "Ilha do Bazaruto",
            "Bazaruto Island",
            "Ilha do Parque Nacional do Arquipélago de Bazaruto.",
            "Island of the Bazaruto Archipelago National Park.",
            "Inhassoro",
            -21.6493,
            35.4698,
            "way/253819812",
          ),
        ],
      },
    ],
  },
  {
    code: "EK-NAM-004",
    province: "nampula",
    intensity: "low",
    interests: ["culture", "heritage", "beach"],
    titlePt: "Ilha de Moçambique a pé",
    titleEn: "Mozambique Island on foot",
    descPt:
      "Dois dias na Ilha de Moçambique, Património Mundial da UNESCO, e na costa de Mossuril.",
    descEn:
      "Two days on Mozambique Island, a UNESCO World Heritage Site, and on the Mossuril coast.",
    suggestionsPt: "caminhada pela Cidade de Pedra e Cal, provar matapa com caranguejo",
    suggestionsEn: "walking through the Stone Town, tasting matapa with crab",
    days: [
      {
        pt: "Cidade de Pedra e Cal",
        en: "Stone Town",
        stops: [D("ilha"), FORTALEZA_ILHA, PALACIO],
      },
      {
        pt: "Mossuril",
        en: "Mossuril",
        stops: [
          T("Deslocação Ilha de Moçambique → Chocas-Mar", "Travel Mozambique Island → Chocas-Mar"),
          CHOCAS,
        ],
      },
    ],
  },
  {
    code: "EK-NAM-005",
    province: "nampula",
    intensity: "medium",
    interests: ["culture", "heritage", "local_life"],
    titlePt: "Da cidade de Nampula à Ilha de Moçambique",
    titleEn: "From Nampula city to Mozambique Island",
    descPt:
      "O Museu Nacional de Etnologia em Nampula e três dias na Ilha de Moçambique e na Baía de Mossuril.",
    descEn:
      "The National Museum of Ethnology in Nampula and three days on Mozambique Island and Mossuril Bay.",
    suggestionsPt: "caminhada pela Cidade de Pedra e Cal, visita às praias",
    suggestionsEn: "walking through the Stone Town, beaches",
    days: [
      { pt: "Nampula", en: "Nampula", stops: [MUSEU_NPL] },
      {
        pt: "Ilha de Moçambique",
        en: "Mozambique Island",
        stops: [
          T("Deslocação Nampula → Ilha de Moçambique", "Travel Nampula → Mozambique Island"),
          D("ilha"),
        ],
      },
      { pt: "Cidade de Pedra e Cal", en: "Stone Town", stops: [FORTALEZA_ILHA, PALACIO] },
      { pt: "Baía de Mossuril", en: "Mossuril Bay", stops: [MOSSURIL] },
    ],
  },
  {
    code: "EK-NAM-006",
    province: "nampula",
    intensity: "medium",
    interests: ["culture", "heritage", "beach", "local_life"],
    titlePt: "Nampula: Angoche e a Ilha de Moçambique",
    titleEn: "Nampula: Angoche and Mozambique Island",
    descPt:
      "Seis dias pela província de Nampula: a cidade, a costa de Angoche e a Ilha de Moçambique.",
    descEn: "Six days across Nampula province: the city, the Angoche coast and Mozambique Island.",
    suggestionsPt: "visita às praias, caminhada pela Cidade de Pedra e Cal",
    suggestionsEn: "beaches, walking through the Stone Town",
    days: [
      { pt: "Nampula", en: "Nampula", stops: [MUSEU_NPL] },
      {
        pt: "Angoche",
        en: "Angoche",
        stops: [
          T("Deslocação Nampula → Angoche", "Travel Nampula → Angoche"),
          P(
            "Angoche",
            "Angoche",
            "Cidade costeira do sul da província de Nampula.",
            "Coastal town in the south of Nampula province.",
            "Angoche",
            -16.2292,
            39.9081,
            "node/899428282",
          ),
        ],
      },
      {
        pt: "Regresso a Nampula",
        en: "Back to Nampula",
        stops: [T("Deslocação Angoche → Nampula", "Travel Angoche → Nampula")],
      },
      {
        pt: "Ilha de Moçambique",
        en: "Mozambique Island",
        stops: [
          T("Deslocação Nampula → Ilha de Moçambique", "Travel Nampula → Mozambique Island"),
          D("ilha"),
        ],
      },
      { pt: "Cidade de Pedra e Cal", en: "Stone Town", stops: [FORTALEZA_ILHA, PALACIO] },
      { pt: "Mossuril", en: "Mossuril", stops: [MOSSURIL, CHOCAS] },
    ],
  },
];

const q = (s: string | null) => (s === null ? "NULL" : `'${s.replace(/'/g, "''")}'`);
const arr = (a: string[]) => `ARRAY[${a.map(q).join(",")}]::text[]`;

function sql(): string {
  const out: string[] = ["DO $import$", "DECLARE rid uuid; did uuid;", "BEGIN"];
  for (const r of ROUTES) {
    out.push(
      `  IF EXISTS (SELECT 1 FROM public.routes WHERE unique_code = ${q(r.code)}) THEN RAISE EXCEPTION 'route exists: ${r.code}'; END IF;`,
    );
    out.push(
      `  INSERT INTO public.routes (owner_id, title, title_en, description, description_en, province_id, unique_code, duration_days, is_public, is_curated, status, review_status, interests, intensity, requires_validation, catalog_notes_pt, catalog_notes_en)` +
        ` VALUES (NULL, ${q(r.titlePt)}, ${q(r.titleEn)}, ${q(r.descPt)}, ${q(r.descEn)}, (SELECT id FROM public.provinces WHERE code = ${q(r.province)}), ${q(r.code)}, ${r.days.length}, true, true, 'active', 'approved', ${arr(r.interests)}, ${q(r.intensity)}, false, ${q(NOTE_PT(r.suggestionsPt))}, ${q(NOTE_EN(r.suggestionsEn))}) RETURNING id INTO rid;`,
    );
    (r.provinces ?? []).forEach((p, i) =>
      out.push(
        `  INSERT INTO public.route_provinces (route_id, province_id, position) VALUES (rid, (SELECT id FROM public.provinces WHERE code = ${q(p)}), ${i + 1});`,
      ),
    );
    r.days.forEach((d, i) => {
      out.push(
        `  INSERT INTO public.route_days (route_id, day_number, title, title_en) VALUES (rid, ${i + 1}, ${q(d.pt)}, ${q(d.en)}) RETURNING id INTO did;`,
      );
      d.stops.forEach((s, j) => {
        const order = j + 1;
        if (s.kind === "dest")
          out.push(
            `  INSERT INTO public.route_stops (route_day_id, stop_order, stop_type, destination_id, validation_status) VALUES (did, ${order}, 'destination', (SELECT id FROM public.destinations WHERE slug = ${q(s.slug)}), 'confirmed');`,
          );
        else if (s.kind === "travel")
          out.push(
            `  INSERT INTO public.route_stops (route_day_id, stop_order, stop_type, custom_title_pt, custom_title_en, notes, validation_status) VALUES (did, ${order}, 'travel', ${q(s.pt)}, ${q(s.en)}, 'Tempo de viagem a confirmar', 'confirmed');`,
          );
        else
          out.push(
            `  INSERT INTO public.route_stops (route_day_id, stop_order, stop_type, custom_title_pt, custom_title_en, description_pt, description_en, location, lat, lng, source_url, source_label, validation_status) VALUES (did, ${order}, 'custom_stop', ${q(s.pt)}, ${q(s.en)}, ${q(s.dpt)}, ${q(s.den)}, ${q(s.loc)}, ${s.lat}, ${s.lng}, ${q(s.osm)}, 'OpenStreetMap', 'confirmed');`,
          );
      });
    });
  }
  out.push("END $import$;");
  return out.join("\n");
}

if (import.meta.main) console.log(sql());
