import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { DEFAULT_LANG, readLangCookie, readStoredLang, writeLangPref } from "@/lib/lang-pref";

export type Lang = "pt" | "en";

const dict = {
  confirmEmailFirst: {
    pt: "O teu email ainda não foi confirmado. Abre a ligação que te enviámos ou pede uma nova.",
    en: "Your email is not confirmed yet. Open the link we sent you or request a new one.",
  },
  accountLoadErrorTitle: {
    pt: "Não foi possível carregar a tua conta",
    en: "We couldn't load your account",
  },
  accountLoadError: {
    pt: "Não conseguimos ler o teu perfil e permissões. Verifica a ligação e tenta novamente.",
    en: "We couldn't read your profile and permissions. Check your connection and try again.",
  },
  retry: { pt: "Tentar novamente", en: "Try again" },
  // games (games.tsx) — PT is the original text, EN its translation
  gameTitle_g1: { pt: "Explorador de Story Stops", en: "Story Stop Explorer" },
  gameDesc_g1: { pt: "Visita 5 Story Stops na cidade.", en: "Visit 5 Story Stops in the city." },
  gameBadge_g1: { pt: "Caçador de Tesouros", en: "Treasure Hunter" },
  gameDetail_g1: {
    pt: "Cada Story Stop revela uma história única do local. Visita pelo menos 5 para completar.",
    en: "Each Story Stop reveals a unique story about the place. Visit at least 5 to complete.",
  },
  gameTitle_g2: { pt: "Bairro Completo", en: "Whole Neighbourhood" },
  gameDesc_g2: {
    pt: "Descobre todos os pontos de um bairro.",
    en: "Discover every point in a neighbourhood.",
  },
  gameBadge_g2: { pt: "Explorador Urbano", en: "Urban Explorer" },
  gameDetail_g2: {
    pt: "Visita os 8 pontos marcados num bairro à tua escolha.",
    en: "Visit the 8 points marked in a neighbourhood of your choice.",
  },
  gameTitle_g3: { pt: "Rota das Praias", en: "Beach Route" },
  gameDesc_g3: { pt: "Conhece 3 praias diferentes.", en: "Get to know 3 different beaches." },
  gameBadge_g3: { pt: "Explorador de Praias", en: "Beach Explorer" },
  gameDetail_g3: {
    pt: "Visita 3 praias distintas em Moçambique e regista a tua presença.",
    en: "Visit 3 different beaches in Mozambique and record your presence.",
  },
  gameTitle_g4: { pt: "Aventura na Ilha", en: "Island Adventure" },
  gameDesc_g4: { pt: "Explora um arquipélago completo.", en: "Explore a whole archipelago." },
  gameBadge_g4: { pt: "Insular", en: "Islander" },
  gameDetail_g4: {
    pt: "Desbloqueia após completar 'Rota das Praias'.",
    en: "Unlocks after completing 'Beach Route'.",
  },
  gameTitle_g5: { pt: "Foto com História", en: "Photo with History" },
  gameDesc_g5: { pt: "Tira fotos a 3 locais históricos.", en: "Take photos of 3 historic places." },
  gameBadge_g5: { pt: "Fotógrafo Cultural", en: "Cultural Photographer" },
  gameDetail_g5: {
    pt: "Documenta locais com importância histórica.",
    en: "Document places of historical importance.",
  },
  gameTitle_g6: { pt: "Sabores de Moçambique", en: "Flavours of Mozambique" },
  gameDesc_g6: { pt: "Fotografa 3 pratos típicos.", en: "Photograph 3 typical dishes." },
  gameBadge_g6: { pt: "Foodie", en: "Foodie" },
  gameDetail_g6: {
    pt: "Matapa, caril de caranguejo, frango à zambeziana...",
    en: "Matapa, crab curry, Zambezian chicken...",
  },
  gameTitle_g7: { pt: "Cores da Comunidade", en: "Colours of the Community" },
  gameDesc_g7: { pt: "Captura 4 momentos comunitários.", en: "Capture 4 community moments." },
  gameBadge_g7: { pt: "Olhar Atento", en: "Keen Eye" },
  gameDetail_g7: {
    pt: "Sempre com permissão das pessoas fotografadas.",
    en: "Always with the permission of the people photographed.",
  },
  gameTitle_g8: { pt: "Retrato de Artesão", en: "Artisan Portrait" },
  gameDesc_g8: { pt: "Conhece e fotografa um artesão.", en: "Meet and photograph an artisan." },
  gameBadge_g8: { pt: "Embaixador", en: "Ambassador" },
  gameDetail_g8: {
    pt: "Pede sempre permissão e oferece uma cópia da foto.",
    en: "Always ask permission and offer a copy of the photo.",
  },
  gameTitle_g9: { pt: "Amigo da Comunidade", en: "Friend of the Community" },
  gameDesc_g9: {
    pt: "Participa numa experiência comunitária.",
    en: "Take part in a community experience.",
  },
  gameBadge_g9: { pt: "Amigo da Comunidade", en: "Friend of the Community" },
  gameDetail_g9: {
    pt: "Reserva uma experiência local através da plataforma.",
    en: "Book a local experience through the platform.",
  },
  gameTitle_g10: { pt: "Mercado Vivo", en: "Living Market" },
  gameDesc_g10: {
    pt: "Compra algo direto a um produtor local.",
    en: "Buy something directly from a local producer.",
  },
  gameBadge_g10: { pt: "Apoio Local", en: "Local Supporter" },
  gameDetail_g10: {
    pt: "Visita um mercado tradicional e apoia produtores locais.",
    en: "Visit a traditional market and support local producers.",
  },
  gameTitle_g11: { pt: "Aprende uma Palavra", en: "Learn a Word" },
  gameDesc_g11: {
    pt: "Aprende 3 palavras em línguas locais.",
    en: "Learn 3 words in local languages.",
  },
  gameBadge_g11: { pt: "Poliglota Local", en: "Local Polyglot" },
  gameDetail_g11: {
    pt: "Escreve a palavra que aprendeste para registar a conquista.",
    en: "Write the word you learned to record the achievement.",
  },
  gameTitle_g12: { pt: "Saída de Pesca", en: "Fishing Trip" },
  gameDesc_g12: {
    pt: "Participa numa pescaria tradicional.",
    en: "Take part in a traditional fishing outing.",
  },
  gameBadge_g12: { pt: "Pescador", en: "Fisher" },
  gameDetail_g12: {
    pt: "Desbloqueia após 'Amigo da Comunidade'.",
    en: "Unlocks after 'Friend of the Community'.",
  },
  gameTitle_g13: { pt: "Quiz do Destino", en: "Destination Quiz" },
  gameDesc_g13: {
    pt: "Responde a 7 perguntas sobre Moçambique.",
    en: "Answer 7 questions about Mozambique.",
  },
  gameBadge_g13: { pt: "Historiador", en: "Historian" },
  gameDetail_g13: {
    pt: "Quiz com 10 perguntas embaralhadas, 7 por sessão.",
    en: "Quiz with 10 shuffled questions, 7 per session.",
  },
  gameTitle_g14: { pt: "Curiosidades de Moçambique", en: "Mozambique Curiosities" },
  gameDesc_g14: { pt: "Descobre factos surpreendentes.", en: "Discover surprising facts." },
  gameBadge_g14: { pt: "Curioso", en: "Curious Mind" },
  gameDetail_g14: {
    pt: "Quiz curto com factos surpreendentes.",
    en: "Short quiz with surprising facts.",
  },
  gameTitle_g15: { pt: "Mestre das Línguas", en: "Language Master" },
  gameDesc_g15: { pt: "Aprende vocabulário avançado.", en: "Learn advanced vocabulary." },
  gameBadge_g15: { pt: "Linguista", en: "Linguist" },
  gameDetail_g15: {
    pt: "Desbloqueia após 'Aprende uma Palavra'.",
    en: "Unlocks after 'Learn a Word'.",
  },
  gameTitle_g16: { pt: "Roteiro Completo", en: "Complete Route" },
  gameDesc_g16: { pt: "Completa um roteiro de 6 paragens.", en: "Complete a route with 6 stops." },
  gameBadge_g16: { pt: "Mestre dos Roteiros", en: "Route Master" },
  gameDetail_g16: {
    pt: "Conclui todas as paragens no tempo previsto.",
    en: "Finish every stop within the planned time.",
  },
  gameTitle_g17: { pt: "Do Nascer ao Pôr-do-Sol", en: "From Sunrise to Sunset" },
  gameDesc_g17: { pt: "Captura amanhecer e entardecer.", en: "Capture dawn and dusk." },
  gameBadge_g17: { pt: "Madrugador", en: "Early Bird" },
  gameDetail_g17: {
    pt: "Regista dois momentos do mesmo dia.",
    en: "Record two moments of the same day.",
  },
  gameTitle_g18: { pt: "Maratona Cultural", en: "Cultural Marathon" },
  gameDesc_g18: { pt: "3 eventos culturais em 7 dias.", en: "3 cultural events in 7 days." },
  gameBadge_g18: { pt: "Maratonista Cultural", en: "Cultural Marathoner" },
  gameDetail_g18: {
    pt: "Desbloqueia após completar um 'Roteiro Completo'.",
    en: "Unlocks after completing a 'Complete Route'.",
  },
  gameTitle_g19: { pt: "Leva Alguém Contigo", en: "Bring Someone Along" },
  gameDesc_g19: { pt: "Convida amigo a explorar.", en: "Invite a friend to explore." },
  gameBadge_g19: { pt: "Companheiro", en: "Companion" },
  gameDetail_g19: {
    pt: "Partilha um roteiro com alguém e visita juntos.",
    en: "Share a route with someone and visit together.",
  },
  gameTitle_g20: { pt: "Conta a Tua História", en: "Tell Your Story" },
  gameDesc_g20: { pt: "Escreve 3 notas sobre lugares.", en: "Write 3 notes about places." },
  gameBadge_g20: { pt: "Contador de Histórias", en: "Storyteller" },
  gameDetail_g20: {
    pt: "Escreve a tua nota para um lugar visitado.",
    en: "Write your note for a place you visited.",
  },
  gameTitle_g21: { pt: "Embaixador Ekaya", en: "Ekaya Ambassador" },
  gameDesc_g21: { pt: "Partilha 2 conquistas.", en: "Share 2 achievements." },
  gameBadge_g21: { pt: "Embaixador", en: "Ambassador" },
  gameDetail_g21: {
    pt: "Partilha conquistas e ajuda outros viajantes.",
    en: "Share achievements and help other travellers.",
  },
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
  modules: { pt: "Módulos", en: "Modules" },
  logout: { pt: "Sair", en: "Sign out" },
  // module names
  modMap: { pt: "Explorar Mapa", en: "Explore Map" },
  modCulture: { pt: "Cultura e História", en: "Culture & History" },
  modFavorites: { pt: "Meus Favoritos", en: "My Favorites" },
  modNews: { pt: "Notícias & Avisos", en: "News & Alerts" },
  modItineraries: { pt: "Roteiros", en: "Itineraries" },
  modExperiences: { pt: "Atividades", en: "Activities" },
  modInfo: { pt: "Informações Úteis", en: "Useful Info" },
  modAchievements: { pt: "Conquistas", en: "Achievements" },
  modGames: { pt: "Jogos & Desafios", en: "Games & Challenges" },
  modImpact: { pt: "Impacto Social", en: "Social Impact" },
  // module descriptions
  modMapDesc: {
    pt: "Mapa interativo com locais autênticos",
    en: "Interactive map with authentic places",
  },
  modCultureDesc: {
    pt: "Timeline e património de Moçambique",
    en: "Timeline and heritage of Mozambique",
  },
  modFavoritesDesc: {
    pt: "Os teus locais e experiências guardados",
    en: "Your saved places and experiences",
  },
  modNewsDesc: { pt: "Atualizações em tempo real", en: "Real-time updates" },
  modItinerariesDesc: {
    pt: "Cria e partilha roteiros únicos",
    en: "Create and share unique itineraries",
  },
  modExperiencesDesc: { pt: "Reserva experiências comunitárias", en: "Book community experiences" },
  modInfoDesc: { pt: "Vistos, moeda, transportes", en: "Visa, currency, transport" },
  modAchievementsDesc: {
    pt: "XP, selos, placar e recompensas",
    en: "XP, badges, leaderboard and rewards",
  },
  modGamesDesc: { pt: "Quizzes e desafios que dão XP", en: "Quizzes and challenges that earn XP" },
  modBusinesses: { pt: "🏪 Negócios Locais", en: "🏪 Local Businesses" },
  modCommunityExp: { pt: "👥 Experiências Comunitárias", en: "👥 Community Experiences" },
  modCommunityExpDesc: {
    pt: "Atividades gratuitas, sem reserva, por província",
    en: "Free activities, no booking, by province",
  },
  modBusinessesDesc: {
    pt: "Descobre negócios comunitários e as suas experiências",
    en: "Discover community businesses and their experiences",
  },
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
  gamiSub: {
    pt: "Ganha XP, sobe de nível e desbloqueia recompensas únicas",
    en: "Earn XP, level up and unlock unique rewards",
  },
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
  mapSub: {
    pt: "Descobre destinos autênticos em Moçambique",
    en: "Discover authentic destinations in Mozambique",
  },
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
  expTitle: { pt: "Atividades", en: "Activities" },
  expSub: {
    pt: "Reserva atividades autênticas guiadas por locais",
    en: "Book authentic activities guided by locals",
  },
  bookNow: { pt: "Reservar", en: "Book now" },
  booked: { pt: "Reservado!", en: "Booked!" },
  hours: { pt: "horas", en: "hours" },
  hour: { pt: "hora", en: "hour" },
  perPerson: { pt: "por pessoa", en: "per person" },
  category: { pt: "Categoria", en: "Category" },
  allCategories: { pt: "Todas", en: "All" },
  bookingConfirmed: { pt: "Reserva confirmada", en: "Booking confirmed" },
  bookingDesc: {
    pt: "Receberás detalhes no e-mail (simulado).",
    en: "You will receive details via email (simulated).",
  },
  // community
  communityTitle: { pt: "Comunidade Ekaya", en: "Ekaya Community" },
  communitySubtitle: { pt: "Partilha a tua experiência", en: "Share your experience" },
  yourVoiceMatters: { pt: "A Sua Voz Importa", en: "Your Voice Matters" },
  yourVoiceSub: {
    pt: "Partilha a tua experiência em Moçambique e inspira outros viajantes.",
    en: "Share your Mozambique experience and inspire other travelers.",
  },
  shareExperience: { pt: "Partilhar Experiência", en: "Share Experience" },
  newMessage: { pt: "Nova Mensagem", en: "New Message" },
  sendFeedback: { pt: "Enviar", en: "Send" },
  usefulButton: { pt: "Útil", en: "Useful" },
  likesRemaining: { pt: "likes restantes", en: "likes remaining" },
  mostRecent: { pt: "Mais Recentes", en: "Most Recent" },
  mostRated: { pt: "Mais Avaliadas", en: "Most Rated" },
  mostLiked: { pt: "Mais Curtidas", en: "Most Liked" },
  privacyNote: {
    pt: "Por motivos de privacidade, não é possível responder a outras mensagens.",
    en: "For privacy reasons, replies to other messages are not allowed.",
  },
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
  kpiSubtitle: {
    pt: "Métricas que demonstram o impacto real da plataforma",
    en: "Metrics that demonstrate the platform's real impact",
  },
  impactAreas: { pt: "Áreas de Impacto", en: "Impact Areas" },
  vsLastMonth: { pt: "vs. mês anterior", en: "vs. last month" },
  whyNotJustApp: {
    pt: "Porque não é apenas mais uma app turística?",
    en: "Why is this more than just a tourism app?",
  },
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
  communityFeedEmpty: {
    pt: "Ainda não existem publicações nesta comunidade.",
    en: "There are no posts in this community yet.",
  },
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
  communityReportSent: {
    pt: "Obrigado. A publicação foi enviada para análise.",
    en: "Thank you. The post was sent for review.",
  },
  communityPostCreated: { pt: "Publicação criada.", en: "Post created." },
  communityPostUpdated: { pt: "Publicação atualizada.", en: "Post updated." },
  communityPostDeleted: { pt: "Publicação eliminada.", en: "Post deleted." },
  communityRequiredFields: {
    pt: "Preenche título, conteúdo, categoria e província.",
    en: "Fill in title, content, category and province.",
  },
  communityLoadError: {
    pt: "Não foi possível carregar a comunidade.",
    en: "Could not load the community.",
  },
  communityRelated: { pt: "Relacionado", en: "Related" },
  communityBack: { pt: "Voltar à Comunidade", en: "Back to Community" },
  communityOpen: { pt: "Ver publicação", en: "View post" },
  communityLoading: { pt: "A carregar…", en: "Loading…" },
  communityImageSoon: {
    pt: "Imagens serão ativadas quando o armazenamento seguro estiver disponível.",
    en: "Images will be enabled once secure storage is available.",
  },
  reasonSpam: { pt: "Spam", en: "Spam" },
  reasonInappropriate: { pt: "Conteúdo inapropriado", en: "Inappropriate content" },
  reasonMisleading: { pt: "Informação enganosa", en: "Misleading information" },
  reasonOffensive: { pt: "Conteúdo ofensivo", en: "Offensive content" },
  reasonOther: { pt: "Outro", en: "Other" },
} as const;

export type DictKey = keyof typeof dict;

/** Pure dictionary lookup (used by the provider; also for code outside React and tests). */
export function translate(key: DictKey, lang: Lang): string {
  return dict[key]?.[lang] ?? key;
}

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
}

const LanguageContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Same value on server and client (the cookie), so the first render already has the right language.
  const [lang, setLangState] = useState<Lang>(() => readLangCookie() ?? DEFAULT_LANG);

  useEffect(() => {
    // Choice saved before the cookie existed: apply it once and move it to the cookie.
    if (readLangCookie()) return;
    const stored = readStoredLang();
    if (stored) {
      setLangState(stored);
      writeLangPref(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    writeLangPref(l);
  };

  const t = (key: DictKey) => translate(key, lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
