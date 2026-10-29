import { createFileRoute } from "@tanstack/react-router";

import { LegalPending } from "@/components/LegalPending";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Termos de utilização — Ekaya Explore" }] }),
  component: () => <LegalPending kind="terms" />,
});
