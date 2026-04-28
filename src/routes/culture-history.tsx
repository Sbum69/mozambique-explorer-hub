import { createFileRoute } from "@tanstack/react-router";
import { Stub } from "@/components/Stub";

export const Route = createFileRoute("/culture-history")({
  head: () => ({ meta: [{ title: "culture-history — Ekaya Explore" }] }),
  component: () => <Stub title="culture-history" />,
});
