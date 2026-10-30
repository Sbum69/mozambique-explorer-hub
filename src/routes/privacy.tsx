import { createFileRoute } from "@tanstack/react-router";

import { LegalPending } from "@/components/LegalPending";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Política de privacidade — Ekaya Explore" }] }),
  component: () => <LegalPending kind="privacy" />,
});
