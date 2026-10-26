import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Store,
  Building2,
  ShoppingBag,
  Sparkles,
  MapPin,
  Tag,
  FileText,
  Phone,
  Check,
  Shield,
  LogIn,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { registerMyBusiness } from "@/lib/business-registration.functions";
import type { BusinessRegistrationError } from "@/lib/business-registration";
import { useBusinessCategories, useProvinces } from "@/hooks/useProvinces";
import { useBackTarget } from "@/lib/nav";

export const Route = createFileRoute("/business-register")({
  head: () => ({
    meta: [
      { title: "Registar negócio — Ekaya Explore" },
      {
        name: "description",
        content:
          "Registra a tua banca, lodge ou serviço turístico e chega a viajantes em Moçambique.",
      },
      { property: "og:title", content: "Registar negócio — Ekaya Explore" },
      {
        property: "og:description",
        content:
          "Registra a tua banca, lodge ou serviço turístico e chega a viajantes em Moçambique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusinessRegisterPage,
});

// Categories and provinces come from the database (business_categories / provinces).
// The account comes from Supabase Auth: signed-out visitors create an account or sign in first.

const RETURN_SEARCH = { redirect: "/business-register" } as const;

const TXT = {
  pt: {
    back: "Voltar",
    signIn: "Entrar",
    loading: "A carregar…",
    heroTitle: "Registe o Seu Negócio",
    heroSub: "Junte-se à rede de turismo comunitário de Moçambique",
    gateTitle: "Cria conta ou entra para registar o teu negócio",
    gateBody:
      "O negócio fica associado à tua conta. Depois de entrares, voltas a esta página para preencher os dados do negócio.",
    createAccount: "Criar conta",
    large: "Negócio Grande",
    largeDesc: "Lodges, restaurantes, bares, agências de turismo",
    small: "Negócio Pequeno",
    smallDesc: "Bancas, vendedores ambulantes, artesãos",
    select: "Selecionar",
    selectPlaceholder: "Selecionar...",
    info: "Informações do Negócio",
    name: "Nome do Negócio *",
    category: "Categoria *",
    province: "Província *",
    location: "Cidade / Localização *",
    description: "Descrição *",
    contact: "Contacto *",
    required: "Preenche todos os campos obrigatórios",
    submitting: "A registar...",
    submit: "Registar Negócio",
    successTitle: "Sucesso!",
    successBody: "O teu negócio foi criado.",
    pendingTitle: "Aguardando Verificação",
    pendingBody:
      "Um administrador irá rever e aprovar o teu negócio em breve. Podes começar a configurar o teu perfil enquanto isso.",
    goDashboard: "Ir para Dashboard",
    errors: {
      UNAVAILABLE: "Não foi possível verificar a tua conta. Tenta novamente.",
      ADMIN_ACCOUNT: "Contas de administrador não podem registar negócios.",
      ALREADY_HAS_BUSINESS: "Esta conta já tem um negócio registado.",
      INVALID_PROVINCE: "Escolhe uma província válida da lista.",
      INVALID_CATEGORY: "Escolhe uma categoria válida da lista.",
      BUSINESS_FAILED: "Não foi possível criar o negócio. Tenta novamente.",
      ROLE_FAILED: "Não foi possível concluir o registo. Nada foi guardado; tenta novamente.",
      NETWORK: "Sem ligação. Tenta novamente.",
    },
  },
  en: {
    back: "Back",
    signIn: "Sign in",
    loading: "Loading…",
    heroTitle: "Register Your Business",
    heroSub: "Join Mozambique's community tourism network",
    gateTitle: "Create an account or sign in to register your business",
    gateBody:
      "The business is linked to your account. After signing in you come back to this page to fill in the business details.",
    createAccount: "Create account",
    large: "Large Business",
    largeDesc: "Lodges, restaurants, bars, tour agencies",
    small: "Small Business",
    smallDesc: "Stalls, street vendors, artisans",
    select: "Select",
    selectPlaceholder: "Select...",
    info: "Business Information",
    name: "Business Name *",
    category: "Category *",
    province: "Province *",
    location: "City / Location *",
    description: "Description *",
    contact: "Contact *",
    required: "Fill in all required fields",
    submitting: "Registering...",
    submit: "Register Business",
    successTitle: "Success!",
    successBody: "Your business has been created.",
    pendingTitle: "Awaiting Verification",
    pendingBody:
      "An administrator will review and approve your business soon. You can start setting up your profile meanwhile.",
    goDashboard: "Go to Dashboard",
    errors: {
      UNAVAILABLE: "We couldn't check your account. Try again.",
      ADMIN_ACCOUNT: "Administrator accounts cannot register businesses.",
      ALREADY_HAS_BUSINESS: "This account already has a registered business.",
      INVALID_PROVINCE: "Choose a valid province from the list.",
      INVALID_CATEGORY: "Choose a valid category from the list.",
      BUSINESS_FAILED: "We couldn't create the business. Try again.",
      ROLE_FAILED: "We couldn't complete the registration. Nothing was saved; try again.",
      NETWORK: "No connection. Try again.",
    },
  },
} satisfies Record<
  "pt" | "en",
  { errors: Record<BusinessRegistrationError | "NETWORK", string> } & Record<string, unknown>
>;

function BusinessRegisterPage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = TXT[lang];
  const { isAuthenticated, isLoading, retryLoad } = useAuth();
  const backTarget = useBackTarget();
  const [step, setStep] = useState<1 | 2>(1);
  const [businessType, setBusinessType] = useState<"small" | "large" | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [location, setLocation] = useState("");
  const { provinces, loading: loadingProvinces } = useProvinces();
  const { categories, loading: loadingCategories } = useBusinessCategories();
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");

  const gradient =
    businessType === "large" ? "from-blue-600 to-blue-700" : "from-orange-700 to-orange-700";
  const badgeColor =
    businessType === "large"
      ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
      : "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300";

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (isAuthenticated) {
      navigate({ to: backTarget });
    } else {
      navigate({ to: "/login" });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!businessType) return;
    if (!businessName || !category || !provinceCode || !location || !description || !contact) {
      toast.error(t.required);
      return;
    }

    setSubmitting(true);
    const result = await registerMyBusiness({
      data: { businessName, businessType, category, provinceCode, location, description, contact },
    }).catch(() => ({ ok: false, error: "NETWORK" }) as const);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(t.errors[result.error]);
      return;
    }
    // Roles changed on the server: reload them so the app sees the business account.
    retryLoad();
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-teal-50 dark:from-teal-950/30 via-white dark:via-background to-blue-50 dark:to-blue-950/30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full bg-card rounded-3xl shadow-2xl p-10 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="mx-auto size-24 rounded-full bg-green-700 text-white flex items-center justify-center shadow-lg"
          >
            <Check className="size-12" />
          </motion.div>
          <h1 className="mt-6 text-3xl font-bold">{t.successTitle}</h1>
          <p className="mt-2 text-muted-foreground">{t.successBody}</p>

          <div className="mt-6 flex items-start gap-3 text-left rounded-2xl border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-4">
            <Shield className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-200">{t.pendingTitle}</p>
              <p className="text-sm text-blue-800 dark:text-blue-400 mt-1">{t.pendingBody}</p>
            </div>
          </div>

          <button
            onClick={() => navigate({ to: "/business-dashboard", search: { status: "all" } })}
            className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-teal-700 to-blue-600 text-white font-semibold shadow-lg hover:opacity-95 transition"
          >
            {t.goDashboard}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 dark:from-teal-950/30 via-white dark:via-background to-blue-50 dark:to-blue-950/30">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-foreground hover:text-foreground font-medium"
          >
            <ArrowLeft className="size-4" /> {t.back}
          </button>
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-12 rounded-full transition ${step >= 1 ? "bg-teal-600" : "bg-muted"}`}
              />
              <div
                className={`h-2 w-12 rounded-full transition ${step >= 2 ? "bg-teal-600" : "bg-muted"}`}
              />
            </div>
          )}
          {!isAuthenticated ? (
            <Link
              to="/login"
              search={RETURN_SEARCH}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t.signIn}
            </Link>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-10 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
          className="mx-auto size-20 rounded-2xl bg-gradient-to-br from-teal-700 to-blue-600 text-white flex items-center justify-center shadow-xl"
        >
          <Store className="size-10" />
        </motion.div>
        <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">{t.heroTitle}</h1>
        <p className="mt-2 text-muted-foreground">{t.heroSub}</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground">{t.loading}</p>
        ) : !isAuthenticated ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto bg-card shadow-xl rounded-3xl p-8 text-center"
          >
            <h2 className="text-xl font-bold">{t.gateTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.gateBody}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                to="/signup"
                search={RETURN_SEARCH}
                className="inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-teal-700 to-blue-600 text-white font-semibold shadow-lg hover:opacity-95 transition"
              >
                <UserPlus className="size-4" /> {t.createAccount}
              </Link>
              <Link
                to="/login"
                search={RETURN_SEARCH}
                className="inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card text-foreground font-semibold hover:bg-muted transition"
              >
                <LogIn className="size-4" /> {t.signIn}
              </Link>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid md:grid-cols-2 gap-6"
              >
                <motion.button
                  whileHover={{ y: -5 }}
                  onClick={() => {
                    setBusinessType("large");
                    setStep(2);
                  }}
                  className="text-left bg-card shadow-xl rounded-2xl p-8 border-2 border-transparent hover:border-teal-500 transition"
                >
                  <div className="size-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center">
                    <Building2 className="size-8" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold">{t.large}</h3>
                  <p className="mt-1 text-muted-foreground text-sm">{t.largeDesc}</p>
                  <div className="mt-4 flex items-center gap-2 text-teal-700 dark:text-teal-300 font-semibold">
                    <Sparkles className="size-4" /> {t.select}
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ y: -5 }}
                  onClick={() => {
                    setBusinessType("small");
                    setStep(2);
                  }}
                  className="text-left bg-card shadow-xl rounded-2xl p-8 border-2 border-transparent hover:border-orange-500 transition"
                >
                  <div className="size-16 rounded-2xl bg-gradient-to-br from-orange-700 to-orange-700 text-white flex items-center justify-center">
                    <ShoppingBag className="size-8" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold">{t.small}</h3>
                  <p className="mt-1 text-muted-foreground text-sm">{t.smallDesc}</p>
                  <div className="mt-4 flex items-center gap-2 text-orange-700 dark:text-orange-300 font-semibold">
                    <Sparkles className="size-4" /> {t.select}
                  </div>
                </motion.button>
              </motion.div>
            )}

            {step === 2 && businessType && (
              <motion.form
                key="step2"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                onSubmit={handleSubmit}
                className="bg-card shadow-xl rounded-3xl p-8"
              >
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badgeColor}`}
                >
                  {businessType === "large" ? t.large : t.small}
                </span>

                <h2 className="mt-4 text-xl font-bold">{t.info}</h2>
                <div className="mt-4 grid gap-4">
                  <Field icon={<Store className="size-4" />} label={t.name}>
                    <input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </Field>
                  <Field icon={<Tag className="size-4" />} label={t.category}>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={inputClass}
                      required
                    >
                      <option value="">
                        {loadingCategories ? t.loading : t.selectPlaceholder}
                      </option>
                      {categories.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name[lang]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field icon={<MapPin className="size-4" />} label={t.province}>
                    <select
                      value={provinceCode}
                      onChange={(e) => setProvinceCode(e.target.value)}
                      className={inputClass}
                      required
                    >
                      <option value="">{loadingProvinces ? t.loading : t.selectPlaceholder}</option>
                      {provinces.map((p) => (
                        <option key={p.id} value={p.code}>
                          {p.name[lang]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field icon={<MapPin className="size-4" />} label={t.location}>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </Field>
                  <Field icon={<FileText className="size-4" />} label={t.description}>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className={inputClass}
                      required
                    />
                  </Field>
                  <Field icon={<Phone className="size-4" />} label={t.contact}>
                    <input
                      type="tel"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="+258 84 123 4567"
                      className={inputClass}
                      required
                    />
                  </Field>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`mt-8 w-full py-4 rounded-xl bg-gradient-to-r ${gradient} text-white font-semibold shadow-lg hover:opacity-95 transition disabled:opacity-70`}
                >
                  {submitting ? t.submitting : t.submit}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition";

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
        <span className="text-teal-700 dark:text-teal-300">{icon}</span> {label}
      </span>
      {children}
    </label>
  );
}
