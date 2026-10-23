import { useState } from "react";
import { Share2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLang } from "@/contexts/LanguageContext";

/** Reusable share payload — news, events, and later activities/routes. */
export interface SharePayload {
  title: string;
  description?: string;
  url: string;
}

type Platform = "whatsapp" | "instagram" | "x";

function buildText(p: SharePayload) {
  const d = p.description ? ` — ${p.description.slice(0, 140)}` : "";
  return `${p.title}${d}`;
}

export function platformShareUrl(platform: Platform, p: SharePayload): string {
  const text = buildText(p);
  switch (platform) {
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(`${text}\n${p.url}`)}`;
    case "x":
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(p.url)}`;
    case "instagram":
      return "https://www.instagram.com/";
  }
}

export function ShareButton({
  payload,
  className,
  size = "icon",
}: {
  payload: SharePayload;
  className?: string;
  size?: "icon" | "sm";
}) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const pt = lang === "pt";
  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const nativeShare = async () => {
    try {
      await navigator.share({ title: payload.title, text: buildText(payload), url: payload.url });
      setOpen(false);
      return true;
    } catch (e: any) {
      if (e?.name === "AbortError") return true;
      return false;
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${buildText(payload)}\n${payload.url}`);
      return true;
    } catch {
      return false;
    }
  };

  const share = async (platform: Platform) => {
    if (platform === "instagram") {
      // Instagram has no web share URL: use the native share sheet when available,
      // otherwise copy the text + link and open Instagram to paste it.
      if (canNative && (await nativeShare())) return;
      const ok = await copy();
      toast.success(
        ok
          ? pt ? "Link copiado — cola-o no Instagram." : "Link copied — paste it on Instagram."
          : pt ? "A abrir o Instagram." : "Opening Instagram.",
      );
    }
    window.open(platformShareUrl(platform, payload), "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const items: { id: Platform; label: string; cls: string }[] = [
    { id: "whatsapp", label: "WhatsApp", cls: "bg-success/15 text-success" },
    { id: "instagram", label: "Instagram", cls: "bg-accent text-accent-foreground" },
    { id: "x", label: "X (Twitter)", cls: "bg-muted text-foreground" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className={className}
          aria-label={pt ? "Partilhar" : "Share"}
          onClick={(e) => e.stopPropagation()}
        >
          <Share2 className="size-4" />
          {size === "sm" && (pt ? "Partilhar" : "Share")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">
          {pt ? "Partilhar em" : "Share on"}
        </p>
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => share(it.id)}
            className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
          >
            <span className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${it.cls}`}>
              {it.label[0]}
            </span>
            {it.label}
          </button>
        ))}
        {canNative && (
          <button
            type="button"
            onClick={nativeShare}
            className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
          >
            <Share2 className="size-4" /> {pt ? "Mais opções…" : "More options…"}
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            const ok = await copy();
            toast[ok ? "success" : "error"](ok ? (pt ? "Link copiado" : "Link copied") : pt ? "Não foi possível copiar" : "Couldn't copy");
            setOpen(false);
          }}
          className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
        >
          <Link2 className="size-4" /> {pt ? "Copiar link" : "Copy link"}
        </button>
      </PopoverContent>
    </Popover>
  );
}
