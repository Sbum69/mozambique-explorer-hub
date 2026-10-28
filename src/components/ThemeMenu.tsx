import { useEffect, useRef, type ReactElement } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ThemePreference } from "@/lib/theme";

const ICON = { light: Sun, dark: Moon, system: Monitor } as const;

/** The theme menu itself (Radix dropdown); loaded only when the toggle is first used. */
export default function ThemeMenu({
  trigger,
  open,
  onOpenChange,
  focusTrigger,
  value,
  onValueChange,
  labels,
  onReady,
}: {
  trigger: ReactElement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focusTrigger: boolean;
  value: ThemePreference;
  onValueChange: (pref: ThemePreference) => void;
  labels: { label: string; light: string; dark: string; system: string };
  onReady: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  // From now on Radix opens and closes the menu from the trigger.
  useEffect(() => onReady(), [onReady]);
  // The placeholder button was replaced by this one: keep keyboard focus where it was. Only when the
  // menu mounts closed (opened menus move focus inside themselves; pulling it back would close them).
  const openedOnMount = useRef(open);
  useEffect(() => {
    if (focusTrigger && !openedOnMount.current) ref.current?.focus();
  }, [focusTrigger]);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild ref={ref}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{labels.label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onValueChange(v as ThemePreference)}
        >
          {(["light", "dark", "system"] as const).map((p) => {
            const ItemIcon = ICON[p];
            return (
              <DropdownMenuRadioItem key={p} value={p} className="gap-2">
                <ItemIcon className="size-4" aria-hidden="true" />
                {labels[p]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
