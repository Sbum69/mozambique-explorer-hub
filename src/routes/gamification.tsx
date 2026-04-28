import { createFileRoute } from "@tanstack/react-router";
import { Stub } from "@/components/Stub";

export const Route = createFileRoute("/gamification")({
  head: () => ({ meta: [{ title: "gamification — Ekaya Explore" }] }),
  component: () => <Stub title="gamification" />,
});
