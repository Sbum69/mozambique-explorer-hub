/** Requisitos de validação por desafio (jogos) */
export interface GameTask {
  /** exige prova fotográfica */
  photo?: boolean;
  /** seletor de paragens (caça ao tesouro) */
  stops?: boolean;
  /** escolher uma experiência comunitária */
  experience?: boolean;
  /** escolher roteiro + paragem concluída */
  itinerary?: boolean;
  /** registar momento do dia (amanhecer / pôr-do-sol) */
  timeOfDay?: boolean;
  /** registar evento cultural com data (últimos 7 dias) */
  event?: boolean;
  /** partilhar (Web Share / copiar link) */
  share?: boolean;
  /** palavra + significado */
  word?: boolean;
  /** nota escrita com mínimo de caracteres */
  note?: number;
}

export const GAME_TASKS: Record<string, GameTask> = {
  // Caça ao tesouro
  g1: { stops: true, photo: true },
  g2: { stops: true, photo: true },
  g3: { stops: true, photo: true },
  g4: { stops: true, photo: true },
  // Fotografia
  g5: { photo: true },
  g6: { photo: true },
  g7: { photo: true },
  g8: { photo: true, note: 20 },
  // Experiências
  g9: { experience: true, photo: true },
  g10: { experience: true, photo: true, note: 15 },
  g11: { word: true },
  g12: { experience: true, photo: true },
  // Tempo
  g16: { itinerary: true },
  g17: { timeOfDay: true, photo: true },
  g18: { event: true, photo: true },
  // Sociais
  g19: { share: true, itinerary: true },
  g20: { note: 60 },
  g21: { share: true },
};

export function getGameTask(gameId: string): GameTask {
  return GAME_TASKS[gameId] ?? {};
}

const KEY = "ekaya.game.logs";

export interface GameLogEntry {
  gameId: string;
  at: string;
  label: string;
}

export function getGameLogs(gameId: string): GameLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, GameLogEntry[]>) : {};
    return all[gameId] ?? [];
  } catch {
    return [];
  }
}

export function addGameLog(gameId: string, label: string) {
  try {
    const raw = localStorage.getItem(KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, GameLogEntry[]>) : {};
    all[gameId] = [...(all[gameId] ?? []), { gameId, at: new Date().toISOString(), label }];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
