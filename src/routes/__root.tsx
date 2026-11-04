import { useEffect } from "react";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGateProvider } from "@/contexts/AuthGateContext";
import { LanguageProvider, useLang } from "@/contexts/LanguageContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { DEFAULT_LANG, readLangCookie } from "@/lib/lang-pref";
import { securityHeaders } from "@/lib/security-headers";
import { loadBrandFonts } from "@/lib/brand-fonts";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { Toaster } from "@/components/ui/sonner";
import { LegalAcceptanceGate } from "@/components/LegalAcceptanceGate";
import { MfaChallengeGate } from "@/components/MfaChallengeGate";
import { AssistantLauncher } from "@/components/AssistantLauncher";

function NotFoundComponent() {
  const { lang } = useLang();
  const pt = lang === "pt";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {pt ? "Página não encontrada" : "Page not found"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {pt ? "Esta página não existe ou foi movida." : "This page doesn't exist or has moved."}
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {pt ? "Voltar ao início" : "Back to home"}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // The HTML depends on the language cookie: shared caches must not mix languages.
  // Security headers on every page; Vary: Cookie because the HTML depends on the language cookie.
  headers: () => ({
    Vary: "Cookie",
    ...securityHeaders(import.meta.env.VITE_SUPABASE_URL),
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Ekaya Explore — Turismo comunitário em Moçambique" },
      {
        name: "description",
        content:
          "Descobre Moçambique de forma autêntica. Conecta-te a comunidades locais, cria roteiros personalizados e gera impacto positivo em cada viagem.",
      },
      { property: "og:title", content: "Ekaya Explore" },
      {
        property: "og:description",
        content: "Hub de turismo comunitário inteligente para Moçambique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
    // Applies the saved (or system) theme before the first paint: no white flash in dark mode.
    scripts: [{ children: THEME_INIT_SCRIPT }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    // The theme script sets class/style on <html> before React hydrates.
    <html lang={readLangCookie() ?? DEFAULT_LANG} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Brand fonts after the first paint (see brand-fonts.ts).
  useEffect(() => loadBrandFonts(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AuthGateProvider>
              <NotificationsProvider>
                <FavoritesProvider>
                  <Outlet />
                  <LegalAcceptanceGate />
                  <MfaChallengeGate />
                  <AssistantLauncher />
                  <ThemedToaster />
                </FavoritesProvider>
              </NotificationsProvider>
            </AuthGateProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster theme={resolved} />;
}
