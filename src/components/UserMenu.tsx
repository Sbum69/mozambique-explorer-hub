import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Settings, Shield, Store, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { SETTINGS_TXT } from "@/lib/page-texts";
import { cn } from "@/lib/utils";

/** The user's photo (or initial) — opens Profile, Settings and Sign out. Nothing for visitors. */
export function UserMenu({ className }: { className?: string }) {
  const { user, isAuthenticated, isAdmin, isBusiness, logout } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  if (!isAuthenticated || !user || user.role === "guest") return null;
  const t = SETTINGS_TXT[lang];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.menuLabel}
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-full p-0.5 sm:pr-3 sm:bg-muted text-sm text-foreground hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <UserAvatar name={user.displayName} url={user.avatarUrl} />
        <span className="hidden sm:inline max-w-[10rem] truncate font-medium">
          {user.displayName}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user.displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" hash="profile" className="gap-2">
            <UserRound className="size-4" aria-hidden="true" />
            {t.menuProfile}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="gap-2">
            <Settings className="size-4" aria-hidden="true" />
            {t.menuSettings}
          </Link>
        </DropdownMenuItem>
        {isBusiness && (
          <DropdownMenuItem asChild>
            <Link to="/business-dashboard" search={{ status: "all" }} className="gap-2">
              <Store className="size-4" aria-hidden="true" />
              {t.menuBusiness}
            </Link>
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin" className="gap-2">
              <Shield className="size-4" aria-hidden="true" />
              {t.menuAdmin}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          onSelect={() => void logout().then(() => navigate({ to: "/login", replace: true }))}
        >
          <LogOut className="size-4" aria-hidden="true" />
          {t.menuSignOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
