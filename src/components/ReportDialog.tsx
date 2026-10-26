import { useState } from "react";
import { motion } from "framer-motion";
import { Flag, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/contexts/LanguageContext";
import { reportCommunityPost, type ReportReason } from "@/lib/community";

/**
 * Report a community post. Lives outside the route file so /community stays code-split
 * (a route module that exports other components is bundled into every page).
 */
const REPORT_REASONS: {
  value: ReportReason;
  key:
    | "reasonSpam"
    | "reasonInappropriate"
    | "reasonMisleading"
    | "reasonOffensive"
    | "reasonOther";
}[] = [
  { value: "spam", key: "reasonSpam" },
  { value: "inappropriate", key: "reasonInappropriate" },
  { value: "misleading", key: "reasonMisleading" },
  { value: "offensive", key: "reasonOffensive" },
  { value: "other", key: "reasonOther" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function ReportDialog({
  post,
  onClose,
}: {
  post: { id: string; title: string };
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const [reason, setReason] = useState<ReportReason>("spam");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await reportCommunityPost(post.id, reason, description);
      toast.success(t("communityReportSent"));
      onClose();
    } catch {
      toast.error(
        lang === "pt" ? "Não foi possível enviar a denúncia." : "Could not send the report.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="bg-foreground text-background p-5 flex items-center justify-between">
          <h3 className="font-bold inline-flex items-center gap-2">
            <Flag className="size-4" /> {t("communityReport")}
          </h3>
          <button
            onClick={onClose}
            aria-label={lang === "pt" ? "Fechar" : "Close"}
            className="size-8 rounded-full hover:bg-background/20 flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2">{post.title}</p>
          <Field label={t("communityReportReason")}>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {t(r.key)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("communityReportDescription")}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              className="h-24"
            />
          </Field>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={sending}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {sending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Flag className="mr-2 size-4" />
            )}
            {t("communityReport")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
