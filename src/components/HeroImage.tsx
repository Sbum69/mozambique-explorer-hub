import avif640 from "@/assets/hero-vilankulo-640.avif";
import avif1024 from "@/assets/hero-vilankulo-1024.avif";
import avif1296 from "@/assets/hero-vilankulo-1296.avif";
import webp640 from "@/assets/hero-vilankulo-640.webp";
import webp1024 from "@/assets/hero-vilankulo-1024.webp";
import webp1296 from "@/assets/hero-vilankulo-1296.webp";
import { PHOTOS } from "@/lib/photo-credits";

/**
 * Dawn in Vilankulo (approved photo D4, credited as PHOTOS["dest-vilankulo"]), 16:9, in modern
 * formats and three widths; the original is 1296 px wide, so nothing is upscaled.
 */
export const HERO_AVIF_SRCSET = `${avif640} 640w, ${avif1024} 1024w, ${avif1296} 1296w`;
const HERO_WEBP_SRCSET = `${webp640} 640w, ${webp1024} 1024w, ${webp1296} 1296w`;
/** Credit shown on top of the hero (see PhotoCredit). */
export const HERO_PHOTO = PHOTOS["dest-vilankulo"];

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
        width={1296}
        height={729}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        // React 19 passes fetchPriority through to the DOM attribute.
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}
