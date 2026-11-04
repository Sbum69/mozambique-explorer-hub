/**
 * Assistant phase 2 — provider skeleton, OFF by default. Phase 1 (FAQ engine) is what runs.
 * Turning a provider on is a deliberate change: set ASSISTANT_PROVIDER on the server
 * (wrangler secret), keep the keys only in server secrets, and switch ASSISTANT_LLM_ENABLED.
 *
 *   none        FAQ only (current).
 *   cloudflare  Workers AI, @cf/qwen/qwen3-30b-a3b-fp8, free allocation only (9 000 Neurons cap).
 *   anthropic   skeleton only; not wired (paid API — needs a decision).
 */
export type ProviderName = "none" | "cloudflare" | "anthropic";

/** Feature flag. false = the panel never calls a model. */
export const ASSISTANT_LLM_ENABLED = false;

export const CLOUDFLARE_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";

export interface ProviderRequest {
  question: string;
  lang: "pt" | "en";
  /** FAQ entries given as the only sources, cited as [FAQ:slug]. */
  sources: { slug: string; text: string }[];
}

export interface ProviderReply {
  text: string;
  neurons: number;
}

export interface AssistantProvider {
  name: ProviderName;
  answer(req: ProviderRequest): Promise<ProviderReply | null>;
}

/** Phase 1: never answers, so the caller keeps the FAQ answer. */
export const noneProvider: AssistantProvider = {
  name: "none",
  answer: async () => null,
};

export function providerFor(name: ProviderName | undefined): AssistantProvider {
  if (!ASSISTANT_LLM_ENABLED || !name || name === "none") return noneProvider;
  // cloudflare / anthropic are implemented server-side (assistant.functions.ts) when enabled.
  return noneProvider;
}
