import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

/** className: colour overrides for dark backgrounds (e.g. the home hero). */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "pt" ? "en" : "pt")}
      className={cn("gap-1.5 font-semibold text-foreground", className)}
      aria-label={lang === "pt" ? "Mudar idioma" : "Change language"}
    >
      <Languages className="size-4" />
      {lang.toUpperCase()}
    </Button>
  );
}
