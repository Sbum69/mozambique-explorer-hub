import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { OnboardingModal } from "@/components/OnboardingModal";
import { requireAuthenticatedUser } from "@/lib/auth";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticatedUser();
  },
  head: () => ({
    meta: [
      { title: "Personaliza a tua viagem — Ekaya Explore" },
      {
        name: "description",
        content:
          "Escolhe a província, os dias disponíveis e os teus interesses para receber roteiros comunitários à tua medida.",
      },
      { property: "og:title", content: "Personaliza a tua viagem — Ekaya Explore" },
      {
        property: "og:description",
        content:
          "Escolhe a província, os dias disponíveis e os teus interesses para receber roteiros comunitários à tua medida.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted">
      <OnboardingModal
        open
        onComplete={() => {
          void navigate({ to: "/home", replace: true });
        }}
      />
    </div>
  );
}
