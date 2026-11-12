/**
 * Curation of mocambique_4400_destinos.csv (idea list only, never imported as is).
 * Usage: bun scripts/curate-destinations.ts <path/to/mocambique_4400_destinos.csv>
 * Writes docs/data/curadoria-destinos.csv (one row per distinct province/place/activity, with the
 * decision and the reason) and prints the per-province summary. Not part of the app bundle.
 *
 * Decisions:
 *  - juntar: variant of another row ("ao amanhecer", "variante oficial A/B/C", "(variante oficial)");
 *  - rejeitar: wrong province for the place, or an institutional/generic event with no date and
 *    no verifiable link to the place;
 *  - sugestão: generic activity (safari, walk, bird watching, tasting a dish): never a destination
 *    nor a bookable experience, only a suggestion inside an itinerary day;
 *  - por verificar: needs a source the CSV does not give (specific wildlife, a concrete project).
 * The place itself is a candidate destination only after its real coordinates are checked
 * (the CSV has one approximate point per province).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("usage: bun scripts/curate-destinations.ts <csv>");

type Row = { prov: string; cat: string; name: string; coord: string; src: string };
const rows: Row[] = readFileSync(file, "utf8")
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((l) => {
    const m = l.match(/^([^,]+),(\d+),([^,]+),(.*),"([^"]+)",(\S+)$/);
    if (!m) throw new Error("bad row: " + l);
    return { prov: m[1], cat: m[3], name: m[4].replace(/^"|"$/g, ""), coord: m[5], src: m[6] };
  });

const VARIANT =
  /\s*\(variante oficial( [A-Z])?\)|\s*—\s*variante oficial( [A-Z])?|\s+variante oficial( [A-Z])?|\s+ao (amanhecer|entardecer|anoitecer|pôr do sol|nascer do sol)/gi;
const clean = (s: string) => s.replace(VARIANT, "").replace(/\s+/g, " ").trim();

/** Province where each base place really is (checked against ANAC's list of conservation areas). */
const PLACE_PROVINCE: Record<string, string> = {
  "Parque Nacional das Quirimbas": "Cabo Delgado",
  "Parque Nacional do Limpopo": "Gaza",
  "Parque Nacional do Bazaruto": "Inhambane",
  "Parque Nacional de Chimanimani": "Manica",
  "Reserva Especial de Maputo": "Maputo (província)",
  "Jardim Tunduru": "Maputo Cidade",
  "Reserva Nacional do Niassa": "Niassa",
  "Parque Nacional da Gorongosa": "Sofala",
  "Parque Nacional de Mágoè": "Tete",
  "Parque Nacional do Gilé": "Zambézia",
};

/** Places with no coast (beach and marine activities make no sense there). */
const INLAND = new Set([
  "Parque Nacional do Limpopo",
  "Parque Nacional de Chimanimani",
  "Reserva Nacional do Niassa",
  "Parque Nacional da Gorongosa",
  "Parque Nacional de Mágoè",
  "Parque Nacional do Gilé",
  "Jardim Tunduru",
]);

const splitPlace =(n: string) => {
  const m = n.match(/^(.*?) (?:em|—) ((?:Parque|Reserva|Jardim)[^,]*)$/);
  return m ? { act: m[1], place: m[2] } : { act: n, place: "(cidade)" };
};

function decide(prov: string, place: string, act: string): [string, string] {
  const real = PLACE_PROVINCE[place];
  if (real && real !== prov) return ["rejeitar", `o local fica em ${real}, não em ${prov}`];
  if (INLAND.has(place) && /praias|marinha|aquática|mangais|aves aquáticas|mergulho/i.test(act))
    return ["rejeitar", "atividade de costa num local do interior"];
  if (place === "Jardim Tunduru" && /safari|leões|leopardos|elefantes|savana/i.test(act))
    return ["rejeitar", "não existe num jardim urbano"];
  if (/Jogos Escolares|eventos do (IAM|INCM|INICC)|capacitação|agrotecnia|maneio integrado/i.test(act))
    return ["rejeitar", "evento ou ação institucional sem data nem ligação verificável ao local"];
  if (/^Particip(ar|ação) (em|no)/i.test(act))
    return ["rejeitar", "evento genérico sem data, organizador nem local verificáveis"];
  if (/leões|leopardos|elefantes/i.test(act))
    return ["por verificar", "fauna específica: precisa de fonte do parque (ANAC/gestor) a confirmar a presença"];
  if (/projetos|comunidades/i.test(act))
    return ["por verificar", "projeto ou comunidade concretos não identificados; só com parceiro real"];
  if (/^Provar /i.test(act))
    return ["sugestão", "prato a provar: sugestão dentro de um dia de roteiro, não é destino nem reserva"];
  return ["sugestão", "atividade genérica: sugestão dentro de um dia de roteiro, não é destino"];
}

type Out = { prov: string; place: string; act: string; cat: string; n: number; dec: string; why: string };
const groups = new Map<string, Out>();
const perProv: Record<string, Record<string, number>> = {};
const bump = (p: string, k: string, by = 1) => {
  perProv[p] ??= { linhas: 0, ficaram: 0, juntadas: 0, rejeitadas: 0, "por verificar": 0 };
  perProv[p][k] += by;
};

for (const r of rows) {
  const { act, place } = splitPlace(clean(r.name));
  const key = `${r.prov}|${place}|${act}|${r.cat}`;
  bump(r.prov, "linhas");
  const g = groups.get(key);
  if (g) {
    g.n++;
    bump(r.prov, g.dec === "rejeitar" ? "rejeitadas" : g.dec === "por verificar" ? "por verificar" : "juntadas");
    continue;
  }
  const [dec, why] = decide(r.prov, place, act);
  groups.set(key, { prov: r.prov, place, act, cat: r.cat, n: 1, dec, why });
  bump(r.prov, dec === "rejeitar" ? "rejeitadas" : dec === "por verificar" ? "por verificar" : "ficaram");
}

const csv = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
const lines = [
  ["provincia", "local", "atividade", "categoria", "linhas_no_csv", "decisao", "motivo"].join(","),
  ...[...groups.values()].map((g) =>
    [g.prov, g.place, g.act, g.cat, g.n, g.dec, g.why].map(csv).join(","),
  ),
];
mkdirSync("docs/data", { recursive: true });
writeFileSync("docs/data/curadoria-destinos.csv", lines.join("\n") + "\n");

console.log(`linhas: ${rows.length} · grupos distintos: ${groups.size}`);
console.table(perProv);
const places = new Set([...groups.values()].map((g) => `${g.prov} → ${g.place}`));
console.log([...places].join("\n"));
