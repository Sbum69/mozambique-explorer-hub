import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileWarning } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLang } from "@/contexts/LanguageContext";
import { privacyDoc } from "@/lib/legal/privacy";
import { termsDoc } from "@/lib/legal/terms";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { LEGAL_TXT } from "@/lib/page-texts";

/** Terms of Use / Privacy Policy page: draft notice, version, contents and the sections. */
export function LegalDocument({ kind }: { kind: "terms" | "privacy" }) {
  const { lang } = useLang();
  const t = LEGAL_TXT[lang];
  const doc = kind === "terms" ? termsDoc(lang) : privacyDoc(lang);
  const version = LEGAL_VERSIONS[kind];
  const date = new Date(`${version}T12:00:00`).toLocaleDateString(
    lang === "pt" ? "pt-PT" : "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label={t.back}>
              <Link to="/home">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <h1 className="min-w-0 truncate font-bold text-base sm:text-lg ml-1">{doc.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Card role="note" className="p-4 flex items-start gap-3 border-foreground/40">
          <FileWarning className="size-5 shrink-0 text-foreground mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold">{t.draft}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.draftBody}</p>
          </div>
        </Card>

        <p className="text-sm text-muted-foreground">{t.version(date)}</p>

        <nav aria-labelledby="legal-contents">
          <h2 id="legal-contents" className="font-semibold mb-2">
            {t.contents}
          </h2>
          <ol className="space-y-1 text-sm">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-primary underline-offset-4 hover:underline">
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {doc.sections.map((s) => (
          <section
            key={s.id}
            id={s.id}
            aria-labelledby={`${s.id}-h`}
            className="scroll-mt-20 space-y-3"
          >
            <h2 id={`${s.id}-h`} className="text-lg font-bold">
              {s.heading}
            </h2>
            {s.blocks.map((b, i) =>
              Array.isArray(b) ? (
                <ul key={i} className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
                  {b.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={i} className="text-sm leading-relaxed">
                  {b}
                </p>
              ),
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
