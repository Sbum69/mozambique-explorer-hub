import { createFileRoute } from "@tanstack/react-router";

import { LegalDocument } from "@/components/LegalDocument";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Termos de Utilização — Ekaya Explore" }] }),
  component: () => <LegalDocument kind="terms" />,
});
