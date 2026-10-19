import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "pt" ? "en" : "pt")}
      className="gap-1.5 font-semibold text-foreground"
      aria-label={lang === "pt" ? "Mudar idioma" : "Change language"}
    >
      <Languages className="size-4" />
      {lang.toUpperCase()}
    </Button>
  );
}
