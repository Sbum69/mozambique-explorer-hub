import avif640 from "@/assets/hero-mozambique-640.avif";
import avif1024 from "@/assets/hero-mozambique-1024.avif";
import avif1600 from "@/assets/hero-mozambique-1600.avif";
import webp640 from "@/assets/hero-mozambique-640.webp";
import webp1024 from "@/assets/hero-mozambique-1024.webp";
import webp1600 from "@/assets/hero-mozambique-1600.webp";

/** Same photo as hero-mozambique.jpg (1920×1080), in modern formats and three widths. */
export const HERO_AVIF_SRCSET = `${avif640} 640w, ${avif1024} 1024w, ${avif1600} 1600w`;
const HERO_WEBP_SRCSET = `${webp640} 640w, ${webp1024} 1024w, ${webp1600} 1600w`;

/**
 * Responsive hero photo. `priority` marks it as the page's largest image (eager, high fetch priority);
 * otherwise it loads lazily (e.g. a panel hidden on phones is never downloaded there).
 */
export function HeroImage({
  alt,
  className,
  sizes = "100vw",
  priority = false,
}: {
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <picture>
      <source type="image/avif" srcSet={HERO_AVIF_SRCSET} sizes={sizes} />
      <source type="image/webp" srcSet={HERO_WEBP_SRCSET} sizes={sizes} />
      <img
        src={webp1024}
        alt={alt}
        width={1920}
        height={1080}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        // React 19 passes fetchPriority through to the DOM attribute.
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}
