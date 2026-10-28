import { Suspense, lazy } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChoiceSelectProps } from "@/components/ChoiceSelect";

const ChoiceSelect = lazy(() =>
  import("@/components/ChoiceSelect").then((m) => ({ default: m.ChoiceSelect })),
);

/**
 * ChoiceSelect loaded after the page: Radix Select and its positioning code only arrive once the
 * page is up. Until then a look-alike trigger (same classes as SelectTrigger) shows the value.
 */
export function LazyChoiceSelect(props: ChoiceSelectProps) {
  const current = props.options.find((o) => o.value === props.value)?.label ?? "";
  return (
    <Suspense
      fallback={
        <button
          type="button"
          aria-haspopup="listbox"
          aria-busy="true"
          className={cn(
            "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring [&>span]:line-clamp-1",
            props.className,
          )}
        >
          <span>{current}</span>
          <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
        </button>
      }
    >
      <ChoiceSelect {...props} />
    </Suspense>
  );
}
