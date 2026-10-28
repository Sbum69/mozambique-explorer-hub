import { Suspense, lazy, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

// The Radix menu (and floating-ui) is a separate chunk fetched after the first render, so it is not
// part of the JavaScript every page needs before it can paint.
const ThemeMenu = lazy(() => import("@/components/ThemeMenu"));

const TXT = {
  pt: { label: "Tema", light: "Claro", dark: "Escuro", system: "Sistema" },
  en: { label: "Theme", light: "Light", dark: "Dark", system: "System" },
} as const;

/** Light / dark / system, remembered in this browser; sits next to the language toggle. */
export function ThemeToggle({ className }: { className?: string }) {
  const { lang } = useLang();
  const { preference, resolved, setPreference } = useTheme();
  const t = TXT[lang];
  const Icon = resolved === "dark" ? Moon : Sun;
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [menuReady, setMenuReady] = useState(false);

  const button = (
    <Button
      variant="ghost"
      size="icon"
      className={cn("text-foreground", className)}
      aria-label={`${t.label}: ${t[preference]}`}
      title={`${t.label}: ${t[preference]}`}
      aria-haspopup="menu"
      aria-expanded={open}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      // A click while the menu is still loading opens it as soon as it arrives; then Radix takes over.
      onClick={menuReady ? undefined : () => setOpen(true)}
    >
      <Icon className="size-4" />
    </Button>
  );

  return (
    <Suspense fallback={button}>
      <ThemeMenu
        trigger={button}
        open={open}
        onOpenChange={setOpen}
        focusTrigger={focused}
        value={preference}
        onValueChange={setPreference}
        labels={t}
        onReady={() => setMenuReady(true)}
      />
    </Suspense>
  );
}
