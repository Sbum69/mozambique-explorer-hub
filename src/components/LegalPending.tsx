import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLang } from "@/contexts/LanguageContext";
import { SETTINGS_TXT } from "@/lib/page-texts";

/** Terms / privacy placeholder until the real texts are supplied (no invented legal text). */
export function LegalPending({ kind }: { kind: "terms" | "privacy" }) {
  const { lang } = useLang();
  const t = SETTINGS_TXT[lang];
  const title = kind === "terms" ? t.terms : t.privacy;
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
            <h1 className="min-w-0 truncate font-bold text-base sm:text-lg ml-1">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Card className="p-6 flex items-start gap-3">
          <FileText className="size-5 shrink-0 text-primary mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold">{t.inPreparation}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.legalPending}</p>
          </div>
        </Card>
      </main>
    </div>
  );
}
