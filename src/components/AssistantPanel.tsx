import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Compass, Loader2, Mail, Send, ThumbsDown, ThumbsUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/contexts/LanguageContext";
import { SUPPORT_EMAIL } from "@/lib/app-info";
import { answer, type AssistantReply, type FaqEntry } from "@/lib/assistant/engine";
import {
  fetchCatalogue,
  fetchFaq,
  fetchSlots,
  logUnanswered,
  rateAnswer,
} from "@/lib/assistant/faq";
import { ASSISTANT_LLM_ENABLED } from "@/lib/assistant/provider";
import { ASSISTANT_TXT } from "@/lib/page-texts";
import { OPEN_GUIDE_EVENT } from "@/lib/guide";
import { formatPrice } from "@/lib/price";

type Turn = { id: number; question: string; reply: AssistantReply; rated?: boolean };

/** Help panel: question → FAQ answer (or live price/schedule), with links, suggestions and rating. */
export function AssistantPanel({ onClose }: { onClose: () => void }) {
  // The panels (traveller, business) have a first-entry guide that can be shown again from here.
  const onPanel = useRouterState({
    select: (s) =>
      s.location.pathname === "/dashboard" || s.location.pathname === "/business-dashboard",
  });
  const { lang } = useLang();
  const t = ASSISTANT_TXT[lang];
  const faq = useQuery({ queryKey: ["assistant-faq"], queryFn: fetchFaq, staleTime: 10 * 60_000 });
  const entries: FaqEntry[] = (faq.data ?? []).filter((e) => e.active);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns]);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy || !entries.length) return;
    setBusy(true);
    try {
      const reply = await answer(text, lang, entries, {
        supportEmail: SUPPORT_EMAIL,
        catalogue: fetchCatalogue,
        slots: fetchSlots,
        formatPrice,
      });
      setTurns((list) => [...list, { id: Date.now(), question: text, reply }]);
      if (reply.kind === "none") void logUnanswered(text, reply.lang).catch(() => undefined);
      setQuestion("");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const rate = (turn: Turn, helpful: boolean) => {
    if (!turn.reply.entry) return;
    setTurns((list) => list.map((x) => (x.id === turn.id ? { ...x, rated: true } : x)));
    void rateAnswer(turn.reply.entry.slug, helpful, turn.reply.lang).catch(() => undefined);
  };

  const starters = entries.filter((e) => e.kind === "faq").slice(0, 4);
  const mail = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t.talkSubject)}`;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="assistant-title"
      className="fixed inset-x-2 bottom-2 z-50 flex max-h-[85vh] flex-col rounded-[10px] border border-border bg-card text-card-foreground sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[24rem] print:hidden"
    >
      <div className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div>
          <h2 id="assistant-title" className="font-bold">
            {t.title}
          </h2>
          <p className="text-xs text-muted-foreground">{t.intro}</p>
          <p className="mt-1 text-xs font-medium">{ASSISTANT_LLM_ENABLED ? t.modeAi : t.mode}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={t.close}>
          <X className="size-5" />
        </Button>
      </div>

      {onPanel && (
        <div className="border-b border-border px-4 py-2">
          <Button
            variant="outline"
            className="h-11 w-full gap-2"
            onClick={() => {
              onClose();
              window.dispatchEvent(new Event(OPEN_GUIDE_EVENT));
            }}
          >
            <Compass className="size-4" aria-hidden="true" />
            {t.guideAgain}
          </Button>
        </div>
      )}

      <div ref={logRef} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {faq.isLoading && <p aria-busy="true">{t.thinking}</p>}
        {faq.isError && (
          <div role="alert" className="space-y-2 text-sm">
            <p>{t.errLoad}</p>
            <Button variant="outline" size="sm" onClick={() => void faq.refetch()}>
              {t.retry}
            </Button>
          </div>
        )}
        {!turns.length && starters.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t.start}</p>
            <SuggestionList items={starters} onPick={(q) => void ask(q)} />
          </div>
        )}
        {turns.map((turn) => (
          <div key={turn.id} className="space-y-2">
            <p className="ml-8 rounded-md border border-border p-2 text-sm">
              <span className="sr-only">{t.you}: </span>
              {turn.question}
            </p>
            <div className="mr-4 space-y-2 rounded-md bg-muted p-3 text-sm">
              <span className="sr-only">{t.assistant}: </span>
              <p>{turn.reply.text.replace(" [VALIDAR]", "")}</p>
              {turn.reply.entry?.validate && (
                <p className="text-xs text-muted-foreground">{t.validating}</p>
              )}
              {turn.reply.links.length > 0 && (
                <p className="flex flex-wrap gap-x-3 gap-y-1">
                  <span className="text-muted-foreground">{t.links}</span>
                  {turn.reply.links.map((l) => (
                    <Link
                      key={l.path}
                      to={l.path}
                      onClick={onClose}
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      {turn.reply.lang === "pt" ? l.pt : l.en}
                    </Link>
                  ))}
                </p>
              )}
              {turn.reply.suggestions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t.suggestions}</p>
                  <SuggestionList items={turn.reply.suggestions} onPick={(q) => void ask(q)} />
                </div>
              )}
              {turn.reply.entry && turn.reply.entry.kind !== "refuse" && (
                <div className="flex items-center gap-1">
                  {turn.rated ? (
                    <p className="text-xs text-muted-foreground" role="status">
                      {t.thanks}
                    </p>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground">{t.helpful}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={t.yes}
                        onClick={() => rate(turn, true)}
                      >
                        <ThumbsUp className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={t.no}
                        onClick={() => rate(turn, false)}
                      >
                        <ThumbsDown className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        className="space-y-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <div className="flex gap-2">
          <label htmlFor="assistant-q" className="sr-only">
            {t.inputLabel}
          </label>
          <Input
            id="assistant-q"
            ref={inputRef}
            maxLength={300}
            value={question}
            placeholder={t.placeholder}
            onChange={(e) => setQuestion(e.target.value)}
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={busy || !question.trim()} aria-label={t.send}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
        <a
          href={mail}
          className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4"
        >
          <Mail className="size-3.5" aria-hidden="true" />
          {t.talk}
        </a>
      </form>
    </div>
  );
}

function SuggestionList({ items, onPick }: { items: FaqEntry[]; onPick: (q: string) => void }) {
  const { lang } = useLang();
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((e) => {
        const q = lang === "pt" ? e.qPt : e.qEn;
        return (
          <li key={e.slug}>
            <button
              type="button"
              onClick={() => onPick(q)}
              className="rounded-md border border-border px-2 py-1 text-left text-xs hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              {q}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
