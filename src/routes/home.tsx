import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/components/HomePage";
import { homeHead } from "@/lib/home-head";

/** Same page as "/" (its canonical URL), kept for the existing links. */
export const Route = createFileRoute("/home")({
  head: homeHead,
  component: HomePage,
});
