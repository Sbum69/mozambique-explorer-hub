import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  Check,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { getAuthenticatedUser, signInLanding, validateAuthReturnSearch } from "@/lib/auth";
import { SIGNUP_TXT } from "@/lib/page-texts";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-reset";

export const Route = createFileRoute("/signup")({
  ssr: false,
  validateSearch: validateAuthReturnSearch,
  beforeLoad: async ({ search }) => {
    const user = await getAuthenticatedUser();
    if (user) throw redirect({ to: await signInLanding(user, search.redirect) });
  },
  head: () => ({
    meta: [
      { title: "Criar Conta — EKAYA" },
      {
        name: "description",
        content: "Cria a tua conta EKAYA e começa a descobrir Moçambique.",
      },
      { property: "og:title", content: "Criar Conta — EKAYA" },
      {
        property: "og:description",
        content: "Cria a tua conta EKAYA e começa a descobrir Moçambique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupPage,
});

interface FieldErrors {
  displayName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirm?: string;
  accept?: string;
}

function SignupPage() {
  const { registerUser } = useAuth();
  const { lang } = useLang();
  const t = SIGNUP_TXT[lang];
  const navigate = useNavigate();
  const { redirect: returnTo } = Route.useSearch();
  const loginSearch = returnTo ? { redirect: returnTo } : {};

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!displayName.trim()) e.displayName = t.errName;
    if (!username.trim()) e.username = t.errUsername;
    else if (/\s/.test(username)) e.username = t.errUsernameSpaces;
    if (!email.trim()) e.email = t.errEmailRequired;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t.errEmailInvalid;
    if (!password) e.password = t.errPassword;
    else if (password.length < MIN_PASSWORD_LENGTH) e.password = t.errPasswordShort;
    if (confirm !== password) e.confirm = t.errConfirm;
    if (!accepted) e.accept = t.errAccept;
    return e;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setLoading(true);
    const res = await registerUser({
      username,
      password,
      displayName,
      email,
      returnTo,
      acceptedLegal: accepted,
    });
    setLoading(false);
    if (!res.ok) {
      const msg = res.error ?? t.errGeneric;
      const isPasswordIssue = /palavra-passe|password/i.test(msg) && !/incorret/i.test(msg);
      setErrors(isPasswordIssue ? { password: msg } : { email: msg });
      return;
    }

    setSuccess(true);
    setNeedsConfirmation(!!res.needsConfirmation);
    if (!res.needsConfirmation) setTimeout(() => navigate({ to: returnTo ?? "/onboarding" }), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/login"
            search={loginSearch}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" /> {t.back}
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
        <Card className="p-8 shadow-[var(--shadow-soft)] border-0">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="mx-auto size-20 rounded-full bg-success text-success-foreground flex items-center justify-center shadow-[var(--shadow-soft)]"
                >
                  <Check className="size-10" />
                </motion.div>
                <h2 className="mt-6 text-2xl font-bold">{t.created}</h2>
                <p className="mt-2 text-muted-foreground">{t.welcome(displayName)}</p>
                <p className="mt-4 text-sm text-muted-foreground">
                  {needsConfirmation ? t.confirmEmail : t.preparing}
                </p>
                {needsConfirmation && (
                  <Link
                    to="/login"
                    search={loginSearch}
                    className="mt-6 inline-flex font-semibold text-primary hover:underline"
                  >
                    {t.backToLogin}
                  </Link>
                )}
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="text-center mb-6">
                  <div className="flex h-14 items-center justify-center">
                    <BrandLogo className="h-9" />
                  </div>
                  <h1 className="mt-4 text-2xl font-bold tracking-tight">{t.title}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                  <Field
                    id="displayName"
                    label={t.name}
                    icon={UserIcon}
                    value={displayName}
                    onChange={setDisplayName}
                    error={errors.displayName}
                    placeholder={t.namePh}
                  />
                  <Field
                    id="username"
                    label={t.username}
                    icon={UserIcon}
                    value={username}
                    onChange={(v) => setUsername(v.toLowerCase())}
                    error={errors.username}
                    placeholder={t.usernamePh}
                  />
                  <Field
                    id="email"
                    label="Email"
                    icon={Mail}
                    type="email"
                    value={email}
                    onChange={setEmail}
                    error={errors.email}
                    placeholder={t.emailPh}
                  />
                  <div>
                    <Label htmlFor="password">{t.password}</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPwd ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11"
                        autoComplete="new-password"
                        aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? "password-error" : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => !s)}
                        aria-label={showPwd ? t.hidePassword : t.showPassword}
                        aria-pressed={showPwd}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p id="password-error" className="text-destructive text-sm mt-1">
                        {errors.password}
                      </p>
                    )}
                  </div>
                  <Field
                    id="confirm"
                    label={t.confirm}
                    icon={Lock}
                    type={showPwd ? "text" : "password"}
                    value={confirm}
                    onChange={setConfirm}
                    error={errors.confirm}
                    placeholder={t.confirmPh}
                  />

                  <div className="pt-1">
                    <div className="flex items-start gap-2.5">
                      <Checkbox
                        id="accept-legal"
                        checked={accepted}
                        onCheckedChange={(v) => setAccepted(v === true)}
                        aria-invalid={!!errors.accept}
                        aria-describedby={errors.accept ? "accept-legal-error" : undefined}
                        className="mt-0.5"
                      />
                      <Label htmlFor="accept-legal" className="text-sm font-normal leading-snug">
                        {t.acceptPrefix}{" "}
                        <Link
                          to="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary font-semibold underline underline-offset-2"
                        >
                          {t.acceptTerms}
                        </Link>{" "}
                        {t.acceptAnd}{" "}
                        <Link
                          to="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary font-semibold underline underline-offset-2"
                        >
                          {t.acceptPrivacy}
                        </Link>
                      </Label>
                    </div>
                    {errors.accept && (
                      <p id="accept-legal-error" className="text-destructive text-sm mt-1">
                        {errors.accept}
                      </p>
                    )}
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.98 }}
                    className="w-full mt-4 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-shadow flex items-center justify-center gap-2 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {loading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <UserPlus className="size-5" />
                    )}
                    {loading ? t.creating : t.create}
                  </motion.button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  {t.haveAccount}{" "}
                  <Link
                    to="/login"
                    search={loginSearch}
                    className="text-primary font-semibold hover:underline"
                  >
                    {t.signIn}
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
}

function Field({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
}: FieldProps) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 h-11"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-destructive text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
