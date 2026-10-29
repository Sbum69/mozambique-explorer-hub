import { createFileRoute, redirect } from "@tanstack/react-router";

import { getAuthenticatedUser, postAuthTarget } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ekaya Explore — Turismo Comunitário em Moçambique" },
      {
        name: "description",
        content:
          "Descobre destinos, experiências e roteiros comunitários autênticos em Moçambique.",
      },
      { property: "og:title", content: "Ekaya Explore — Turismo Comunitário em Moçambique" },
      {
        property: "og:description",
        content:
          "Descobre destinos, experiências e roteiros comunitários autênticos em Moçambique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  beforeLoad: async () => {
    const user = await getAuthenticatedUser();
    if (user) throw redirect({ to: await postAuthTarget(user.id) });
    // Visitors without an account explore the public Home directly (demo/share links); no onboarding.
    throw redirect({ to: "/home" });
  },
  component: () => null,
});
