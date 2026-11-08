import {
  BRAND_COLORS,
  LOGO_HEART,
  LOGO_LAST_A,
  LOGO_LETTERS,
  LOGO_LOBES,
  LOGO_VIEWBOX,
  MARK_VIEWBOX,
} from "@/lib/brand";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Only the last A with the heart (narrow spaces). */
  mark?: boolean;
  /** Always the dark-background version (over photos), whatever the theme. */
  onDark?: boolean;
};

/**
 * "Coração do Índico" logo, inline (no extra request). Letters in deep green on light backgrounds
 * and sand on dark ones; on dark the heart gains a thin white outline. Size it with a height class.
 */
export function BrandLogo({ className, mark = false, onDark = false }: Props) {
  const letters = onDark ? "fill-[#F4EEE2]" : "fill-[#0E4B3B] dark:fill-[#F4EEE2]";
  return (
    <svg
      viewBox={mark ? MARK_VIEWBOX : LOGO_VIEWBOX}
      role="img"
      aria-label="EKAYA"
      className={cn("block shrink-0", mark ? "aspect-square" : "aspect-[413/100]", className)}
    >
      {!mark && <path d={LOGO_LETTERS} fillRule="evenodd" className={letters} />}
      <path d={LOGO_LAST_A} className={letters} />
      <path
        d={LOGO_HEART}
        fill="none"
        stroke="#fff"
        strokeWidth={2.4}
        strokeLinejoin="round"
        className={onDark ? undefined : "hidden dark:inline"}
      />
      <path d={LOGO_HEART} fill={BRAND_COLORS.red} />
      <circle cx={LOGO_LOBES.left} cy={LOGO_LOBES.cy} r={LOGO_LOBES.r} fill={BRAND_COLORS.green} />
      <circle
        cx={LOGO_LOBES.right}
        cy={LOGO_LOBES.cy}
        r={LOGO_LOBES.r}
        fill={BRAND_COLORS.yellow}
      />
    </svg>
  );
}
