import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, ShieldCheck, Mail, Store, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { toast } from "sonner";

import hero from "@/assets/hero-mozambique.jpg";
import { getAuthenticatedUser, postAuthTarget } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getAuthenticatedUser();
    if (user) throw redirect({ to: await postAuthTarget(user.id) });
  },
  head: () => ({
    meta: [
      { title: "Entrar — Ekaya Explore" },
      { name: "description", content: "Acede à tua conta Ekaya Explore e descobre Moçambique." },
      { property: "og:title", content: "Entrar — Ekaya Explore" },
      { property: "og:description", content: "Acede à tua conta Ekaya Explore e descobre Moçambique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login, loginAsGuest } = useAuth();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error ?? t("invalidCredentials"));
      return;
    }
    toast.success(t("welcomeBack"));
    if (result.role === "admin") {
      navigate({ to: "/admin" });
      return;
    }
    if (result.role === "business-small" || result.role === "business-large") {
      navigate({ to: "/business-dashboard" });
      return;
    }
    const authenticated = await getAuthenticatedUser();
    navigate({ to: authenticated ? await postAuthTarget(authenticated.id) : "/home" });
  };

  const handleGuest = () => {
    loginAsGuest();
    navigate({ to: "/home" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left visual */}
      <div className="relative hidden lg:block overflow-hidden">
        <img src={hero} alt="Costa de Moçambique" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-secondary/30 to-foreground/60" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2 font-bold text-2xl">
            <span className="size-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              🌍
            </span>
            Ekaya Explore
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl font-bold leading-tight tracking-tight max-w-md">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 text-lg text-white/90 max-w-md">{t("heroSub")}</p>
          </motion.div>
          <div className="text-sm text-white/70">
            🇲🇿 Moçambique · {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="relative flex items-center justify-center p-6 sm:p-10 bg-gradient-to-br from-background via-card to-accent/30">
        <div className="absolute top-4 right-4">
          <LanguageToggle />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="inline-flex size-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground items-center justify-center shadow-[var(--shadow-elegant)]"
            >
              <ShieldCheck className="size-8" />
            </motion.div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">{t("welcomeBack")}</h2>
            <p className="text-muted-foreground text-sm mt-1">{t("loginSubtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-elegant)] hover:opacity-95"
            >
              {loading ? "..." : t("login")}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px bg-border flex-1" />
            ou
            <div className="h-px bg-border flex-1" />
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleGuest}
              className="w-full h-11 gap-2"
            >
              <UserPlus className="size-4" />
              {t("continueAsGuest")}
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full h-11 gap-2 bg-success/5 border-success/30 text-success hover:bg-success/10 hover:text-success">
              <Link to="/business-register">
                <Store className="size-4" />
                {t("registerBusiness")}
              </Link>
            </Button>
          </div>

          <Link
            to="/signup"
            className="mt-3 flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-orange-500 text-orange-600 font-semibold hover:bg-orange-50 transition-colors"
          >
            <UserPlus className="size-4" />
            Não tens conta? Criar Conta Gratuita
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
