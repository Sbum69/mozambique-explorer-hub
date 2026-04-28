import { createFileRoute } from "@tanstack/react-router";
import { Stub } from "@/components/Stub";

export const Route = createFileRoute("/experiences")({
  head: () => ({ meta: [{ title: "experiences — Ekaya Explore" }] }),
  component: () => <Stub title="experiences" />,
});
