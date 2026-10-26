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
import { useLang } from "@/contexts/LanguageContext";
import { MIN_REASON_LENGTH, isValidReason } from "@/lib/admin";
import type { ConfirmOptions } from "@/components/ConfirmDialog";

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

interface Props {
  options: ConfirmOptions | null;
  reason: string;
  setReason: (reason: string) => void;
  finish: (value: { reason: string } | null) => void;
}

/** The dialog behind useConfirm, loaded the first time a confirmation is asked. */
export function ConfirmDialogView({ options, reason, setReason, finish }: Props) {
  const { lang } = useLang();
  const t = TXT[lang];
  const mode = options?.reason ?? "none";
  const blocked = mode === "required" && !isValidReason(reason);

  return (
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
}
