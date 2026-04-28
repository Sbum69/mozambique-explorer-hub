import { createFileRoute } from "@tanstack/react-router";
import { Stub } from "@/components/Stub";

export const Route = createFileRoute("/impact")({
  head: () => ({ meta: [{ title: "impact — Ekaya Explore" }] }),
  component: () => <Stub title="impact" />,
});
