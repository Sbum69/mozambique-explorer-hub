import { useEffect, type ReactElement } from "react";
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

/** The account menu itself (Radix dropdown); loaded after the first render, like the theme menu. */
export default function UserMenuDropdown({
  trigger,
  open,
  onOpenChange,
  onReady,
}: {
  trigger: ReactElement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReady: () => void;
}) {
  const { user, isAdmin, isBusiness, logout } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  useEffect(() => onReady(), [onReady]);
  if (!user) return trigger;
  const t = SETTINGS_TXT[lang];

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
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
