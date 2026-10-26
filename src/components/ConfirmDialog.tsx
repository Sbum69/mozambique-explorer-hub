import { Suspense, lazy, useCallback, useRef, useState, type ReactNode } from "react";

// The AlertDialog only shows after an action, so it stays out of the first load.
const ConfirmDialogView = lazy(() =>
  import("@/components/ConfirmDialogView").then((m) => ({ default: m.ConfirmDialogView })),
);

/**
 * Replaces window.confirm / window.prompt with an accessible, themed dialog.
 * `reason: "required"` blocks confirmation until a reason of MIN_REASON_LENGTH characters is typed.
 */
export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  reason?: "none" | "optional" | "required";
  reasonLabel?: string;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<{ reason: string } | null>;

/** Returns `confirm(options)` and the dialog element, which must be rendered once by the caller. */
export function useConfirm(): [ConfirmFn, ReactNode] {
  const [wanted, setWanted] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [reason, setReason] = useState("");
  const resolver = useRef<((value: { reason: string } | null) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    resolver.current?.(null);
    setReason("");
    setOptions(next);
    setWanted(true);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (value: { reason: string } | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  // Mounted from the first request on, so closing keeps its animation.
  const element = wanted ? (
    <Suspense fallback={null}>
      <ConfirmDialogView options={options} reason={reason} setReason={setReason} finish={finish} />
    </Suspense>
  ) : null;

  return [confirm, element];
}
