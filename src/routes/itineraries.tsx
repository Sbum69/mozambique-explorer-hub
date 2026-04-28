import { createFileRoute } from "@tanstack/react-router";
import { Stub } from "@/components/Stub";

export const Route = createFileRoute("/itineraries")({
  head: () => ({ meta: [{ title: "itineraries — Ekaya Explore" }] }),
  component: () => <Stub title="itineraries" />,
});
