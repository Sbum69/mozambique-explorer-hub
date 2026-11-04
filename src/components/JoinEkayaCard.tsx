import { Link } from "@tanstack/react-router";
import { Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLang } from "@/contexts/LanguageContext";
import { CONTENT_TXT } from "@/lib/page-texts";

/** Empty list with the invitation for local businesses to join. */
export function JoinEkayaCard({ message }: { message: string }) {
  const { lang } = useLang();
  const t = CONTENT_TXT[lang];
  return (
    <Card className="p-6 sm:p-8 text-center space-y-4">
      <Store className="size-10 mx-auto text-muted-foreground" aria-hidden="true" />
      <p className="text-muted-foreground">{message}</p>
      <div className="mx-auto max-w-md space-y-2 border-t border-border pt-4">
        <h2 className="text-lg font-bold">{t.joinTitle}</h2>
        <p className="text-sm">{t.joinBody}</p>
        <Button asChild>
          <Link to="/para-negocios">{t.joinCta}</Link>
        </Button>
      </div>
    </Card>
  );
}
