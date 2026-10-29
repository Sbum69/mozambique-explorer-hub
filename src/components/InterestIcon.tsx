import { interestIcon } from "@/lib/interest-icons";
import { cn } from "@/lib/utils";

/** Lucide icon for an interest or category id (replaces the old emojis, DESIGN-1). Decorative. */
export function InterestIcon({ id, className }: { id: string; className?: string }) {
  const Icon = interestIcon(id);
  return <Icon className={cn("inline-block size-4 shrink-0", className)} aria-hidden="true" />;
}
