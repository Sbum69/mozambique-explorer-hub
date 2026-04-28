import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "pt" | "en";

const dict = {
  // generic
  appName: { pt: "Ekaya Explore", en: "Ekaya Explore" },
  tagline: {
    pt: "Turismo comunitário inteligente em Moçambique",
    en: "Smart community tourism in Mozambique",
  },
  // auth
  login: { pt: "Entrar", en: "Sign in" },
  signup: { pt: "Criar conta", en: "Sign up" },
  username: { pt: "Nome de utilizador", en: "Username" },
  password: { pt: "Código de acesso", en: "Access code" },
  continueAsGuest: { pt: "Continuar como Convidado", en: "Continue as Guest" },
  registerBusiness: { pt: "Registar o meu negócio", en: "Register my business" },
  createAccount: { pt: "Criar nova conta", en: "Create new account" },
  demoCredentials: { pt: "Credenciais de demonstração", en: "Demo credentials" },
  invalidCredentials: { pt: "Credenciais inválidas", en: "Invalid credentials" },
  welcomeBack: { pt: "Bem-vindo de volta", en: "Welcome back" },
  loginSubtitle: {
    pt: "Descobre Moçambique de forma autêntica",
    en: "Discover Mozambique authentically",
  },
  // onboarding
  personalize: { pt: "Personaliza a tua viagem", en: "Personalize your trip" },
  personalizeSub: {
    pt: "Ajuda-nos a recomendar as melhores experiências para ti",
    en: "Help us recommend the best experiences for you",
  },
  step: { pt: "Passo", en: "Step" },
  of: { pt: "de", en: "of" },
  chooseDestination: { pt: "Escolhe o teu destino", en: "Choose your destination" },
  duration: { pt: "Duração da estadia", en: "Length of stay" },
  days: { pt: "dias", en: "days" },
  day: { pt: "dia", en: "day" },
  interests: { pt: "Os teus interesses", en: "Your interests" },
  interestsSub: {
    pt: "Seleciona pelo menos 2 categorias",
    en: "Pick at least 2 categories",
  },
  back: { pt: "Voltar", en: "Back" },
  next: { pt: "Continuar", en: "Continue" },
  confirm: { pt: "Confirmar e explorar", en: "Confirm and explore" },
  skip: { pt: "Pular por agora", en: "Skip for now" },
  mostVisited: { pt: "Mais visitado", en: "Most visited" },
  mostRecommended: { pt: "Mais recomendado", en: "Most recommended" },
  visitorsYear: { pt: "visitantes/ano", en: "visitors/year" },
  // home
  exploreProto: { pt: "Explorar a plataforma", en: "Explore the platform" },
  heroTitle: {
    pt: "Vive Moçambique como um local",
    en: "Live Mozambique like a local",
  },
  heroSub: {
    pt: "Conecta-te a comunidades, descobre histórias autênticas e cria impacto positivo em cada viagem.",
    en: "Connect with communities, discover authentic stories and create positive impact in every journey.",
  },
  // dashboard
  dashboard: { pt: "Painel", en: "Dashboard" },
  hello: { pt: "Olá", en: "Hello" },
  level: { pt: "Nível", en: "Level" },
  xp: { pt: "XP", en: "XP" },
  visited: { pt: "Visitados", en: "Visited" },
  itineraries: { pt: "Roteiros", en: "Itineraries" },
  km: { pt: "KM", en: "KM" },
  modules: { pt: "Módulos", en: "Modules" },
  logout: { pt: "Sair", en: "Sign out" },
  // module names
  modMap: { pt: "Explorar Mapa", en: "Explore Map" },
  modCulture: { pt: "Cultura e História", en: "Culture & History" },
  modFavorites: { pt: "Meus Favoritos", en: "My Favorites" },
  modNews: { pt: "Notícias & Avisos", en: "News & Alerts" },
  modItineraries: { pt: "Roteiros", en: "Itineraries" },
  modExperiences: { pt: "Experiências", en: "Experiences" },
  modInfo: { pt: "Informações Úteis", en: "Useful Info" },
  modAchievements: { pt: "Conquistas", en: "Achievements" },
  modImpact: { pt: "Impacto Social", en: "Social Impact" },
  // module descriptions
  modMapDesc: { pt: "Mapa interativo com locais autênticos", en: "Interactive map with authentic places" },
  modCultureDesc: { pt: "Timeline e património de Moçambique", en: "Timeline and heritage of Mozambique" },
  modFavoritesDesc: { pt: "Os teus locais e experiências guardados", en: "Your saved places and experiences" },
  modNewsDesc: { pt: "Atualizações em tempo real", en: "Real-time updates" },
  modItinerariesDesc: { pt: "Cria e partilha roteiros únicos", en: "Create and share unique itineraries" },
  modExperiencesDesc: { pt: "Reserva experiências comunitárias", en: "Book community experiences" },
  modInfoDesc: { pt: "Vistos, moeda, transportes", en: "Visa, currency, transport" },
  modAchievementsDesc: { pt: "Badges, XP e recompensas", en: "Badges, XP and rewards" },
  modImpactDesc: { pt: "O teu contributo às comunidades", en: "Your contribution to communities" },
  comingSoon: { pt: "Em breve", en: "Coming soon" },
  // interests
  intBeach: { pt: "Praias e Mergulho", en: "Beaches & Diving" },
  intCulture: { pt: "Cultura e História", en: "Culture & History" },
  intFood: { pt: "Gastronomia Local", en: "Local Cuisine" },
  intNature: { pt: "Natureza e Safari", en: "Nature & Safari" },
  intCommunity: { pt: "Experiências Comunitárias", en: "Community Experiences" },
  intHeritage: { pt: "Património UNESCO", en: "UNESCO Heritage" },
  intFestival: { pt: "Festivais e Eventos", en: "Festivals & Events" },
  intAdventure: { pt: "Atividades e Aventura", en: "Activities & Adventure" },
} as const;

export type DictKey = keyof typeof dict;

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
}

const LanguageContext = createContext<LangContextValue | null>(null);
const STORAGE_KEY = "ekaya.lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored === "pt" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key: DictKey) => dict[key]?.[lang] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
