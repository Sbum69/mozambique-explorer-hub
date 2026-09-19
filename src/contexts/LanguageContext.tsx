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
  // gamification
  gamiTitle: { pt: "Conquistas e Recompensas", en: "Achievements & Rewards" },
  gamiSub: { pt: "Ganha XP, sobe de nível e desbloqueia recompensas únicas", en: "Earn XP, level up and unlock unique rewards" },
  yourLevel: { pt: "O teu nível", en: "Your level" },
  toNextLevel: { pt: "para o próximo nível", en: "to next level" },
  badges: { pt: "Conquistas", en: "Badges" },
  rewards: { pt: "Recompensas", en: "Rewards" },
  unlocked: { pt: "Desbloqueado", en: "Unlocked" },
  locked: { pt: "Bloqueado", en: "Locked" },
  claim: { pt: "Resgatar", en: "Claim" },
  claimed: { pt: "Resgatado", en: "Claimed" },
  // map
  mapTitle: { pt: "Mapa Interativo", en: "Interactive Map" },
  mapSub: { pt: "Descobre destinos autênticos em Moçambique", en: "Discover authentic destinations in Mozambique" },
  viewDetails: { pt: "Ver detalhes", en: "View details" },
  backToDashboard: { pt: "Voltar ao painel", en: "Back to dashboard" },
  visitHere: { pt: "Marcar como visitado", en: "Mark as visited" },
  alreadyVisited: { pt: "Já visitado", en: "Already visited" },
  xpGained: { pt: "XP ganhos!", en: "XP earned!" },
  levelUp: { pt: "Subiste de nível!", en: "You leveled up!" },
  newBadgesUnlocked: { pt: "Novas conquistas desbloqueadas!", en: "New badges unlocked!" },
  // directions
  directions: { pt: "Direções", en: "Directions" },
  getDirections: { pt: "Como chegar", en: "Get directions" },
  useMyLocation: { pt: "Usar a minha localização", en: "Use my location" },
  locating: { pt: "A localizar...", en: "Locating..." },
  byCar: { pt: "De carro", en: "By car" },
  byBike: { pt: "De bicicleta", en: "By bike" },
  onFoot: { pt: "A pé", en: "On foot" },
  distance: { pt: "Distância", en: "Distance" },
  routeDuration: { pt: "Duração", en: "Duration" },
  clearRoute: { pt: "Limpar rota", en: "Clear route" },
  routeError: { pt: "Não foi possível calcular a rota.", en: "Could not calculate route." },
  locationError: { pt: "Sem acesso à tua localização.", en: "Location access denied." },
  selectStart: { pt: "Origem", en: "From" },
  selectEnd: { pt: "Destino", en: "To" },
  // experiences
  expTitle: { pt: "Experiências Comunitárias", en: "Community Experiences" },
  expSub: { pt: "Reserva atividades autênticas guiadas por locais", en: "Book authentic activities guided by locals" },
  bookNow: { pt: "Reservar", en: "Book now" },
  booked: { pt: "Reservado!", en: "Booked!" },
  hours: { pt: "horas", en: "hours" },
  hour: { pt: "hora", en: "hour" },
  perPerson: { pt: "por pessoa", en: "per person" },
  category: { pt: "Categoria", en: "Category" },
  allCategories: { pt: "Todas", en: "All" },
  bookingConfirmed: { pt: "Reserva confirmada", en: "Booking confirmed" },
  bookingDesc: { pt: "Receberás detalhes no e-mail (simulado).", en: "You will receive details via email (simulated)." },
  // community
  communityTitle: { pt: "Comunidade Ekaya", en: "Ekaya Community" },
  communitySubtitle: { pt: "Partilha a tua experiência", en: "Share your experience" },
  yourVoiceMatters: { pt: "A Sua Voz Importa", en: "Your Voice Matters" },
  yourVoiceSub: { pt: "Partilha a tua experiência em Moçambique e inspira outros viajantes.", en: "Share your Mozambique experience and inspire other travelers." },
  shareExperience: { pt: "Partilhar Experiência", en: "Share Experience" },
  newMessage: { pt: "Nova Mensagem", en: "New Message" },
  sendFeedback: { pt: "Enviar", en: "Send" },
  usefulButton: { pt: "Útil", en: "Useful" },
  likesRemaining: { pt: "likes restantes", en: "likes remaining" },
  mostRecent: { pt: "Mais Recentes", en: "Most Recent" },
  mostRated: { pt: "Mais Avaliadas", en: "Most Rated" },
  mostLiked: { pt: "Mais Curtidas", en: "Most Liked" },
  privacyNote: { pt: "Por motivos de privacidade, não é possível responder a outras mensagens.", en: "For privacy reasons, replies to other messages are not allowed." },
  limitReached: { pt: "Chegaste ao limite de likes", en: "You have reached the like limit" },
  messagesShared: { pt: "mensagens", en: "messages" },
  averageRating: { pt: "média", en: "average" },
  positiveFeedback: { pt: "positivas", en: "positive" },
  peopleFoundUseful: { pt: "pessoas acharam útil", en: "people found this useful" },
  messageSent: { pt: "Mensagem partilhada com sucesso!", en: "Message shared successfully!" },
  nameField: { pt: "Nome / Pseudónimo", en: "Name / Nickname" },
  countryField: { pt: "País de origem", en: "Country of origin" },
  messageField: { pt: "Mensagem", en: "Message" },
  categoryField: { pt: "Categoria", en: "Category" },
  ratingField: { pt: "Avaliação", en: "Rating" },
  cancel: { pt: "Cancelar", en: "Cancel" },
  charactersLabel: { pt: "caracteres", en: "characters" },
  catGeneral: { pt: "Experiência Geral", en: "General Experience" },
  catBeach: { pt: "Praia & Natureza", en: "Beach & Nature" },
  catCulture: { pt: "Cultura & História", en: "Culture & History" },
  catFood: { pt: "Gastronomia", en: "Cuisine" },
  catCommunity: { pt: "Comunidade Local", en: "Local Community" },
  catLogistics: { pt: "Logística & Transporte", en: "Logistics & Transport" },
  // impact
  impactTitle: { pt: "Impacto Social e Económico", en: "Social & Economic Impact" },
  impactSubtitle: { pt: "Métricas e resultados reais", en: "Real metrics and results" },
  kpiTitle: { pt: "Indicadores-Chave de Performance", en: "Key Performance Indicators" },
  kpiSubtitle: { pt: "Métricas que demonstram o impacto real da plataforma", en: "Metrics that demonstrate the platform's real impact" },
  impactAreas: { pt: "Áreas de Impacto", en: "Impact Areas" },
  vsLastMonth: { pt: "vs. mês anterior", en: "vs. last month" },
  whyNotJustApp: { pt: "Porque não é apenas mais uma app turística?", en: "Why is this more than just a tourism app?" },
  provinceImpact: { pt: "Impacto por Província", en: "Impact by Province" },
  overviewQuick: { pt: "Visão Geral Rápida", en: "Quick Overview" },
  pill11Provinces: { pt: "🌍 Impacto em 11 Províncias", en: "🌍 Impact in 11 Provinces" },
  pillResponsible: { pt: "💚 Turismo 100% Responsável", en: "💚 100% Responsible Tourism" },
  pillOffline: { pt: "📱 Funciona Offline", en: "📱 Works Offline" },
  kpiRevenue: { pt: "Receita para Comunidades", en: "Community Revenue" },
  kpiArtisans: { pt: "Artesãos Apoiados", en: "Artisans Supported" },
  kpiCommunities: { pt: "Comunidades Ativas", en: "Active Communities" },
  kpiSatisfaction: { pt: "Satisfação dos Visitantes", en: "Visitor Satisfaction" },
  // community (real, Supabase-backed)
  communityFeedEmpty: { pt: "Ainda não existem publicações nesta comunidade.", en: "There are no posts in this community yet." },
  communityNewPost: { pt: "Nova publicação", en: "New post" },
  communityEditPost: { pt: "Editar publicação", en: "Edit post" },
  communityPostTitle: { pt: "Título", en: "Title" },
  communityPostContent: { pt: "Conteúdo", en: "Content" },
  communityProvince: { pt: "Província", en: "Province" },
  communityDestination: { pt: "Destino (opcional)", en: "Destination (optional)" },
  communityExperience: { pt: "Experiência (opcional)", en: "Experience (optional)" },
  communityRoute: { pt: "Roteiro (opcional)", en: "Route (optional)" },
  communityPublish: { pt: "Publicar", en: "Publish" },
  communitySave: { pt: "Guardar", en: "Save" },
  communityDelete: { pt: "Eliminar", en: "Delete" },
  communityDeleteConfirm: { pt: "Eliminar esta publicação?", en: "Delete this post?" },
  communitySearch: { pt: "Pesquisar publicações", en: "Search posts" },
  communityAllProvinces: { pt: "Todas as províncias", en: "All provinces" },
  communityMostPopular: { pt: "Mais populares", en: "Most popular" },
  communityLike: { pt: "Gosto", en: "Like" },
  communityDislike: { pt: "Não gosto", en: "Dislike" },
  communityReport: { pt: "Denunciar", en: "Report" },
  communityReportReason: { pt: "Motivo", en: "Reason" },
  communityReportDescription: { pt: "Descrição (opcional)", en: "Description (optional)" },
  communityReportSent: { pt: "Obrigado. A publicação foi enviada para análise.", en: "Thank you. The post was sent for review." },
  communityPostCreated: { pt: "Publicação criada.", en: "Post created." },
  communityPostUpdated: { pt: "Publicação atualizada.", en: "Post updated." },
  communityPostDeleted: { pt: "Publicação eliminada.", en: "Post deleted." },
  communityRequiredFields: { pt: "Preenche título, conteúdo, categoria e província.", en: "Fill in title, content, category and province." },
  communityLoadError: { pt: "Não foi possível carregar a comunidade.", en: "Could not load the community." },
  communityRelated: { pt: "Relacionado", en: "Related" },
  communityBack: { pt: "Voltar à Comunidade", en: "Back to Community" },
  communityOpen: { pt: "Ver publicação", en: "View post" },
  communityLoading: { pt: "A carregar…", en: "Loading…" },
  communityImageSoon: { pt: "Imagens serão ativadas quando o armazenamento seguro estiver disponível.", en: "Images will be enabled once secure storage is available." },
  reasonSpam: { pt: "Spam", en: "Spam" },
  reasonInappropriate: { pt: "Conteúdo inapropriado", en: "Inappropriate content" },
  reasonMisleading: { pt: "Informação enganosa", en: "Misleading information" },
  reasonOffensive: { pt: "Conteúdo ofensivo", en: "Offensive content" },
  reasonOther: { pt: "Outro", en: "Other" },
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
