import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";

function Stub({ title }: { title: string }) {
  const { t } = useLang();
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-background via-card to-accent/30">
      <div className="max-w-md text-center">
        <div className="mx-auto size-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground flex items-center justify-center shadow-[var(--shadow-elegant)]">
          <Construction className="size-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{t("comingSoon")}</p>
        <Button asChild className="mt-6 gap-2" variant="outline">
          <Link to="/dashboard"><ArrowLeft className="size-4" /> {t("dashboard")}</Link>
        </Button>
      </div>
    </div>
  );
}

export function makeStubRoute(path: string, titleKey: string) {
  return createFileRoute(path as never)({
    component: () => <Stub title={titleKey} />,
  });
}

export { Stub };
