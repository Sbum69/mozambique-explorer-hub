import { createFileRoute } from "@tanstack/react-router";
import { Stub } from "@/components/Stub";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "map — Ekaya Explore" }] }),
  component: () => <Stub title="map" />,
});
