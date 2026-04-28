import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Criar conta — Ekaya Explore" }] }),
  component: SignupPage,
});

function SignupPage() {
  return <Placeholder title="Criar nova conta" subtitle="Sistema de registo de turistas — em breve." />;
}

export function Placeholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-background via-card to-accent/30">
      <div className="max-w-md text-center">
        <div className="mx-auto size-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground flex items-center justify-center shadow-[var(--shadow-elegant)]">
          <Construction className="size-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
        <Button asChild className="mt-6 gap-2" variant="outline">
          <Link to="/login"><ArrowLeft className="size-4" /> Voltar</Link>
        </Button>
      </div>
    </div>
  );
}
