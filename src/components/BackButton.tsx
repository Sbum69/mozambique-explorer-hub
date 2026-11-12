import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";
import { useBackTarget } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Props = {
  /**
   * Logical parent page, used when there is no in-app history (the page was opened from a link,
   * a bookmark or a new tab). "auto" = the dashboard with a session, the public Home without.
   */
  fallback: string | "auto";
  /** Shows "Voltar"/"Back" next to the arrow from sm up (phones: arrow only). */
  showLabel?: boolean;
  className?: string;
};

/**
 * The single "back" control of the app. With in-app history it goes back (the page the person
 * came from, scroll and filters included); otherwise it opens the logical parent page, never the
 * Home without reason. On phones it is always the arrow (44 px target), with an accessible name.
 */
export function BackButton({ fallback, showLabel = false, className }: Props) {
  const { lang } = useLang();
  const router = useRouter();
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();
  const auto = useBackTarget();
  const target = fallback === "auto" ? auto : fallback;
  const name = lang === "pt" ? "Voltar" : "Back";

  const goBack = () => {
    if (canGoBack) router.history.back();
    else void navigate({ to: target });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={goBack}
      aria-label={name}
      className={cn("h-11 min-w-11 gap-2 px-2 sm:px-3", className)}
    >
      <ArrowLeft className="size-5" aria-hidden="true" />
      {showLabel ? <span className="hidden sm:inline">{name}</span> : null}
    </Button>
  );
}
