export type NewsCategory = "event" | "tip" | "safety" | "community";

export interface NewsItem {
  id: string;
  title: { pt: string; en: string };
  category: NewsCategory;
  date: string; // ISO
  summary: { pt: string; en: string };
  body: { pt: string; en: string };
  image?: string;
}


export const MOCK_NEWS: NewsItem[] = [
  {
    id: "n1",
    category: "event",
    date: "2026-05-20",
    title: { pt: "Festival de Marrabenta em Maputo", en: "Marrabenta Festival in Maputo" },
    summary: {
      pt: "A capital celebra o ritmo nacional com 3 dias de concertos gratuitos.",
      en: "The capital celebrates the national rhythm with 3 days of free concerts.",
    },
    body: {
      pt: "De 28 a 30 de maio, a Praça da Independência recebe mais de 20 artistas para celebrar a marrabenta. Entrada livre, com gastronomia tradicional e mercado de artesanato.",
      en: "From May 28 to 30, Praça da Independência hosts 20+ artists celebrating marrabenta. Free entry, traditional food and craft market.",
    },
  },
  {
    id: "n2",
    category: "safety",
    date: "2026-05-18",
    title: { pt: "Alerta de chuvas fortes em Inhambane", en: "Heavy rain alert in Inhambane" },
    summary: {
      pt: "INAM prevê chuvas intensas até quinta-feira. Reforce planos de viagem.",
      en: "INAM forecasts heavy rains until Thursday. Reinforce travel plans.",
    },
    body: {
      pt: "O Instituto Nacional de Meteorologia emitiu aviso amarelo para a região costeira. Recomenda-se evitar estradas secundárias e confirmar passeios de barco com operadores locais.",
      en: "The National Meteorology Institute issued a yellow warning for the coast. Avoid secondary roads and confirm boat tours with local operators.",
    },
  },
  {
    id: "n3",
    category: "tip",
    date: "2026-05-15",
    title: { pt: "Como viajar entre Vilankulo e Bazaruto", en: "How to travel between Vilankulo and Bazaruto" },
    summary: {
      pt: "Guia rápido com horários de dhow, preços médios e operadores certificados.",
      en: "Quick guide with dhow schedules, average prices and certified operators.",
    },
    body: {
      pt: "Partidas diárias do porto de Vilankulo entre 07h e 10h. Preço médio 1500–2500 MZN ida-e-volta. Procura operadores com certificação Ekaya para apoiar a comunidade.",
      en: "Daily departures from Vilankulo port between 7am and 10am. Avg price 1500–2500 MZN round-trip. Choose Ekaya-certified operators to support the community.",
    },
  },
  {
    id: "n4",
    category: "community",
    date: "2026-05-12",
    title: { pt: "Nova cooperativa de mulheres na Ilha de Moçambique", en: "New women's cooperative on Mozambique Island" },
    summary: {
      pt: "Roteiro gastronómico liderado por chefs locais já disponível para reserva.",
      en: "Gastronomic itinerary led by local chefs now bookable.",
    },
    body: {
      pt: "A cooperativa Mwarusi reúne 14 cozinheiras que partilham receitas tradicionais macuas. O roteiro inclui mercado, aula de cozinha e jantar partilhado.",
      en: "The Mwarusi cooperative gathers 14 cooks sharing traditional Macua recipes. Includes market, cooking class and shared dinner.",
    },
  },
  {
    id: "n5",
    category: "event",
    date: "2026-05-09",
    title: { pt: "Feira do Caju em Nampula", en: "Cashew Fair in Nampula" },
    summary: {
      pt: "Produtores de 6 províncias reúnem-se durante o fim-de-semana.",
      en: "Producers from 6 provinces gather over the weekend.",
    },
    body: {
      pt: "Provas, vendas diretas e workshops sobre o ciclo do caju. Boa oportunidade para conhecer o interior de Nampula.",
      en: "Tastings, direct sales and workshops about the cashew cycle. Great chance to explore inland Nampula.",
    },
  },
  {
    id: "n6",
    category: "tip",
    date: "2026-05-05",
    title: { pt: "Aplicação offline: descarrega mapas antes de viajar", en: "Offline app: download maps before travelling" },
    summary: {
      pt: "Garante navegação sem rede nas reservas de Gorongosa e Niassa.",
      en: "Ensure offline navigation in Gorongosa and Niassa reserves.",
    },
    body: {
      pt: "No menu Mapa, toca em \"Descarregar região\" para guardar tiles offline. Recomendado antes de safaris.",
      en: "In the Map menu, tap \"Download region\" to save offline tiles. Recommended before safaris.",
    },
  },
];

export const NEWS_CATEGORIES: NewsCategory[] = ["event", "tip", "safety", "community"];

export const newsCategoryLabel = (c: NewsCategory, lang: "pt" | "en") => {
  const map = {
    event: { pt: "Evento", en: "Event" },
    tip: { pt: "Dica de viagem", en: "Travel tip" },
    safety: { pt: "Segurança", en: "Safety" },
    community: { pt: "Comunidade", en: "Community" },
  } as const;
  return map[c][lang];
};
