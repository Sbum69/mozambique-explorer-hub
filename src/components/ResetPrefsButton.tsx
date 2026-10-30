import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";

/** Puts the page filters back to the saved preferences (the preferences themselves never change here). */
export function ResetPrefsButton({ onClick }: { onClick: () => void }) {
  const { lang } = useLang();
  return (
    <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onClick}>
      <RotateCcw className="size-4" aria-hidden="true" />
      {lang === "pt" ? "Repor as minhas preferências" : "Reset to my preferences"}
    </Button>
  );
}
