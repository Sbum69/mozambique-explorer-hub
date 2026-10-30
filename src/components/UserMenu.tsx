import { Suspense, lazy, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { SETTINGS_TXT } from "@/lib/page-texts";
import { cn } from "@/lib/utils";

// The Radix menu is a separate chunk, fetched only when the user reaches for the button (hover or
// tap/Enter), so it is not part of the JavaScript every page runs while it loads.
const UserMenuDropdown = lazy(() => import("@/components/UserMenuDropdown"));

/** The user's photo (or initial) — opens Profile, Settings and Sign out. Nothing for visitors. */
export function UserMenu({ className }: { className?: string }) {
  const { user, isAuthenticated } = useAuth();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [menuReady, setMenuReady] = useState(false);
  const [wanted, setWanted] = useState(false);
  if (!isAuthenticated || !user || user.role === "guest") return null;
  const t = SETTINGS_TXT[lang];

  const trigger = (
    <button
      type="button"
      aria-label={t.menuLabel}
      aria-haspopup="menu"
      aria-expanded={open}
      // A click while the menu is still loading opens it as soon as it arrives; then Radix takes over.
      onClick={
        menuReady
          ? undefined
          : () => {
              setWanted(true);
              setOpen(true);
            }
      }
      onPointerEnter={() => setWanted(true)}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full p-0.5 sm:pr-3 sm:bg-muted text-sm text-foreground hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <UserAvatar name={user.displayName} url={user.avatarUrl} />
      <span className="hidden sm:inline max-w-[10rem] truncate font-medium">
        {user.displayName}
      </span>
    </button>
  );

  if (!wanted) return trigger;
  return (
    <Suspense fallback={trigger}>
      <UserMenuDropdown
        trigger={trigger}
        open={open}
        onOpenChange={setOpen}
        onReady={() => setMenuReady(true)}
      />
    </Suspense>
  );
}

export function UserAvatar({
  name,
  url,
  size = "sm",
}: {
  name: string;
  url?: string;
  size?: "sm" | "lg";
}) {
  const box = size === "lg" ? "size-20 text-2xl" : "size-8 text-xs";
  if (url)
    return (
      <img
        src={url}
        alt=""
        className={cn(box, "shrink-0 rounded-full object-cover bg-muted")}
        loading="lazy"
        decoding="async"
      />
    );
  return (
    <span
      aria-hidden="true"
      className={cn(
        box,
        "shrink-0 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center",
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
