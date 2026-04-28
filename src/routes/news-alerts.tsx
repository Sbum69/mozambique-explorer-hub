import { createFileRoute } from "@tanstack/react-router";
import { Stub } from "@/components/Stub";

export const Route = createFileRoute("/news-alerts")({
  head: () => ({ meta: [{ title: "news-alerts — Ekaya Explore" }] }),
  component: () => <Stub title="news-alerts" />,
});
