import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { OnboardingModal } from "@/components/OnboardingModal";
import { useAuth } from "@/contexts/AuthContext";
import { requireAuthenticatedUser } from "@/lib/auth";

export const Route = createFileRoute("/preferences")({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticatedUser();
  },
  head: () => ({
    meta: [
      { title: "Editar preferências — EKAYA" },
      {
        name: "description",
        content:
          "Actualiza a província, os dias de viagem e os teus interesses para receber recomendações à tua medida.",
      },
      { property: "og:title", content: "Editar preferências — EKAYA" },
      {
        property: "og:description",
        content:
          "Actualiza a província, os dias de viagem e os teus interesses para receber recomendações à tua medida.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PreferencesPage,
});

function PreferencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-muted">
      <OnboardingModal
        open
        initial={{
          province: user?.preferences?.province,
          provinces: user?.preferences?.provinces,
          durationDays: user?.preferences?.durationDays,
          interests: user?.preferences?.interests,
        }}
        onComplete={() => {
          void navigate({ to: "/home", replace: true });
        }}
      />
    </div>
  );
}
