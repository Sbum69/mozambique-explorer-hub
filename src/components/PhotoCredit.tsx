import { useLang } from "@/contexts/LanguageContext";
import { creditFor, licenseLabel, type PhotoCredit as Photo } from "@/lib/photo-credits";
import { cn } from "@/lib/utils";

/**
 * Small "© author · licence" on a bundled photo (FOTOS-1). Renders nothing for other images.
 * The parent must be `relative`. Always light text on a dark veil: it sits on a photo, in both themes.
 */
export function PhotoCredit({
  src,
  photo,
  label,
  className,
}: {
  src?: string | null;
  /** The photo entry itself, when the image has several URLs (srcset). */
  photo?: Photo;
  /** Extra words before the credit, e.g. "Imagem da província". */
  label?: string;
  className?: string;
}) {
  const { lang } = useLang();
  const c = photo ?? creditFor(src);
  if (!c) return null;
  return (
    <span
      className={cn(
        "pointer-events-none absolute bottom-1.5 right-1.5 z-10 max-w-[calc(100%-0.75rem)] truncate rounded bg-black/65 px-1.5 py-0.5 text-[10px] leading-tight text-white",
        className,
      )}
      title={`${c.shows[lang]} — © ${c.author} · ${licenseLabel(c.license, lang)}`}
    >
      {label ? `${label} · ` : ""}© {c.author} · {licenseLabel(c.license, lang)}
    </span>
  );
}
