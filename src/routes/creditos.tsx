import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { useLang } from "@/contexts/LanguageContext";
import { PHOTOS_TXT } from "@/lib/page-texts";
import { ALL_PHOTOS, licenseLabel } from "@/lib/photo-credits";

export const Route = createFileRoute("/creditos")({
  head: () => ({
    meta: [
      { title: "Créditos das fotografias — Ekaya Explore" },
      {
        name: "description",
        content: "Autor, licença e origem de todas as fotografias usadas no Ekaya Explore.",
      },
    ],
  }),
  component: CreditsPage,
});

function CreditsPage() {
  const { lang } = useLang();
  const t = PHOTOS_TXT[lang];
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label={t.back}>
              <Link to="/home">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <h1 className="min-w-0 truncate font-bold text-base sm:text-lg ml-1">
              {t.creditsTitle}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <p className="max-w-prose text-muted-foreground">{t.creditsIntro}</p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {ALL_PHOTOS.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <img
                src={p.thumb ?? p.src}
                alt={p.shows[lang]}
                loading="lazy"
                decoding="async"
                className="aspect-[16/9] w-full object-cover"
              />
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 p-4 text-sm">
                <dt className="text-muted-foreground">{t.shows}</dt>
                <dd className="min-w-0">{p.shows[lang]}</dd>
                <dt className="text-muted-foreground">{t.author}</dt>
                <dd className="min-w-0">{p.author}</dd>
                <dt className="text-muted-foreground">{t.license}</dt>
                <dd className="min-w-0">
                  {p.licenseUrl ? (
                    <a
                      href={p.licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {licenseLabel(p.license, lang)}
                    </a>
                  ) : (
                    licenseLabel(p.license, lang)
                  )}
                </dd>
                <dt className="text-muted-foreground">{t.source}</dt>
                <dd className="min-w-0">
                  <a
                    href={p.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                  >
                    {t.sourceLink}
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                </dd>
              </dl>
            </li>
          ))}
        </ul>
        <p className="max-w-prose text-sm text-muted-foreground">{t.noPhoto}</p>
      </main>
    </div>
  );
}
