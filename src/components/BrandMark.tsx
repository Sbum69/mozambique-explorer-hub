import { cn } from "@/lib/utils";

/** Ekaya mark: an Índico square with an ochre base, like the hem of a capulana (DESIGN-1). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-8 shrink-0 rounded-md bg-primary shadow-[inset_0_-7px_0_var(--color-warning)]",
        className,
      )}
    />
  );
}
