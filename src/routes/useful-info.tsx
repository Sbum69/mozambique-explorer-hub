import { createFileRoute } from "@tanstack/react-router";
import { Stub } from "@/components/Stub";

export const Route = createFileRoute("/useful-info")({
  head: () => ({ meta: [{ title: "useful-info — Ekaya Explore" }] }),
  component: () => <Stub title="useful-info" />,
});
