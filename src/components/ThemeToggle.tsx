import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLang } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { ThemePreference } from "@/lib/theme";

const TXT = {
  pt: { label: "Tema", light: "Claro", dark: "Escuro", system: "Sistema", current: "Tema atual" },
  en: { label: "Theme", light: "Light", dark: "Dark", system: "System", current: "Current theme" },
} as const;

const ICON = { light: Sun, dark: Moon, system: Monitor } as const;

/** Light / dark / system, remembered in this browser; sits next to the language toggle. */
export function ThemeToggle() {
  const { lang } = useLang();
  const { preference, resolved, setPreference } = useTheme();
  const t = TXT[lang];
  const Icon = resolved === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground"
          aria-label={`${t.label}: ${t[preference]}`}
          title={`${t.label}: ${t[preference]}`}
        >
          <Icon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t.label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(v) => setPreference(v as ThemePreference)}
        >
          {(["light", "dark", "system"] as const).map((p) => {
            const ItemIcon = ICON[p];
            return (
              <DropdownMenuRadioItem key={p} value={p} className="gap-2">
                <ItemIcon className="size-4" aria-hidden="true" />
                {t[p]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
