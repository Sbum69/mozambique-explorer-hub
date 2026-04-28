import { createFileRoute } from "@tanstack/react-router";
import { Stub } from "@/components/Stub";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "favorites — Ekaya Explore" }] }),
  component: () => <Stub title="favorites" />,
});
