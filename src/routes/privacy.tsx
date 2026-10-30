import { createFileRoute } from "@tanstack/react-router";

import { LegalDocument } from "@/components/LegalDocument";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Política de Privacidade — Ekaya Explore" }] }),
  component: () => <LegalDocument kind="privacy" />,
});
