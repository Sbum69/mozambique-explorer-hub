import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import {
  fetchGuideOutcome,
  OPEN_GUIDE_EVENT,
  saveGuideOutcome,
  type GuideOutcome,
  type GuideRole,
} from "@/lib/guide";

/**
 * Opens the panel's guide on the first entry (no outcome saved on the account yet), or when the
 * Help menu asks for it. A read error never opens it (nothing is assumed).
 */
export function useGuide(
  role: GuideRole,
  { enabled = true, lang }: { enabled?: boolean; lang: "pt" | "en" },
) {
  const { authUser } = useAuth();
  const uid = authUser?.id;
  const qc = useQueryClient();
  const key = ["guide", uid, role];
  const q = useQuery({
    queryKey: key,
    queryFn: () => fetchGuideOutcome(uid as string, role),
    enabled: !!uid && enabled,
    retry: false,
    staleTime: Infinity,
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (enabled && q.isSuccess && q.data === null) setOpen(true);
  }, [enabled, q.isSuccess, q.data]);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_GUIDE_EVENT, show);
    return () => window.removeEventListener(OPEN_GUIDE_EVENT, show);
  }, []);

  const close = useCallback(
    (outcome: GuideOutcome) => {
      setOpen(false);
      saveGuideOutcome(role, outcome)
        .then(() => qc.setQueryData(["guide", uid, role], outcome))
        .catch(() =>
          toast.error(
            lang === "en"
              ? "Could not save the guide on your account."
              : "Não foi possível guardar o guia na tua conta.",
          ),
        );
    },
    [qc, role, uid, lang],
  );

  return { open, close };
}
