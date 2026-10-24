import { useCallback, useRef, useState, type ReactNode } from "react";

import { useLang } from "@/contexts/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MIN_REASON_LENGTH, isValidReason } from "@/lib/admin";

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

const TXT = {
  pt: {
    confirm: "Confirmar",
    cancel: "Cancelar",
    reason: "Motivo",
    optional: "(opcional)",
    min: `Mínimo ${MIN_REASON_LENGTH} caracteres.`,
  },
  en: {
    confirm: "Confirm",
    cancel: "Cancel",
    reason: "Reason",
    optional: "(optional)",
    min: `At least ${MIN_REASON_LENGTH} characters.`,
  },
} as const;

/** Returns `confirm(options)` and the dialog element, which must be rendered once by the caller. */
export function useConfirm(): [ConfirmFn, ReactNode] {
  const { lang } = useLang();
  const t = TXT[lang];
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [reason, setReason] = useState("");
  const resolver = useRef<((value: { reason: string } | null) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    resolver.current?.(null);
    setReason("");
    setOptions(next);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (value: { reason: string } | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const mode = options?.reason ?? "none";
  const blocked = mode === "required" && !isValidReason(reason);

  const element = (
    <AlertDialog
      open={!!options}
      onOpenChange={(open) => {
        if (!open) finish(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">{options?.title}</AlertDialogTitle>
          {options?.description ? (
            <AlertDialogDescription>{options.description}</AlertDialogDescription>
          ) : (
            <AlertDialogDescription className="sr-only">{options?.title}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {mode !== "none" && (
          <div className="space-y-1.5">
            <label htmlFor="confirm-dialog-reason" className="text-sm font-medium">
              {options?.reasonLabel ?? t.reason}{" "}
              {mode === "optional" && <span className="text-muted-foreground">{t.optional}</span>}
            </label>
            <Textarea
              id="confirm-dialog-reason"
              rows={3}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={blocked && reason.length > 0}
              aria-describedby={mode === "required" ? "confirm-dialog-reason-hint" : undefined}
            />
            {mode === "required" && (
              <p id="confirm-dialog-reason-hint" className="text-xs text-muted-foreground">
                {t.min}
              </p>
            )}
          </div>
        )}
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={blocked}
            className={
              options?.destructive ? buttonVariants({ variant: "destructive" }) : undefined
            }
            onClick={(e) => {
              e.preventDefault();
              if (!blocked) finish({ reason: reason.trim() });
            }}
          >
            {options?.confirmLabel ?? t.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [confirm, element];
}
