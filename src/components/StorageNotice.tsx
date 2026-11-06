import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";

/** Storage key that remembers the notice was seen (a UI preference, see Privacy → Cookies). */
export const STORAGE_NOTICE_KEY = "ekaya.storage-notice";

/**
 * First-visit notice about what the app keeps on the device. Informative only: EKAYA keeps only
 * what it needs to work (session, language, theme, guest mode) and uses no advertising or
 * third-party analytics cookies, so there is nothing to consent to. Texts live here so the notice
 * stays out of the first-load bundle (loaded on demand by StorageNoticeGate).
 */
export const STORAGE_NOTICE_TXT = {
  pt: {
    label: "Aviso sobre armazenamento",
    body: "O EKAYA guarda no teu dispositivo só o essencial para funcionar: a sessão, o idioma, o tema e o modo convidado. Não usamos cookies de publicidade nem análise de terceiros.",
    more: "Saber mais",
    ok: "OK",
  },
  en: {
    label: "Storage notice",
    body: "EKAYA keeps on your device only what it needs to work: your session, language, theme and guest mode. We use no advertising or third-party analytics cookies.",
    more: "Learn more",
    ok: "OK",
  },
} as const;

export function StorageNotice({ onClose }: { onClose: () => void }) {
  const { lang } = useLang();
  const t = STORAGE_NOTICE_TXT[lang];
  const close = () => {
    try {
      localStorage.setItem(STORAGE_NOTICE_KEY, "1");
    } catch {
      // storage blocked: the notice simply shows again next time
    }
    onClose();
  };
  return (
    <aside
      aria-label={t.label}
      className="fixed inset-x-2 bottom-[4.5rem] z-40 mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-[10px] border border-border bg-card p-3 text-sm text-card-foreground print:hidden"
    >
      <Info className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        {t.body}{" "}
        <Link
          to="/privacy"
          hash="armazenamento"
          className="text-primary underline underline-offset-4"
        >
          {t.more}
        </Link>
      </p>
      <Button size="sm" onClick={close}>
        {t.ok}
      </Button>
    </aside>
  );
}
