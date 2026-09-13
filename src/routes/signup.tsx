import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Mail, Lock, User as UserIcon, Loader2, Check, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Criar Conta — Ekaya Explore" },
      { name: "description", content: "Cria a tua conta Ekaya Explore e começa a descobrir Moçambique." },
      { property: "og:title", content: "Criar Conta — Ekaya Explore" },
      { property: "og:description", content: "Cria a tua conta Ekaya Explore e começa a descobrir Moçambique." },
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
}

function SignupPage() {
  const { registerUser } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!displayName.trim()) e.displayName = "Escreve o teu nome";
    if (!username.trim()) e.username = "Escolhe um nome de utilizador";
    else if (/\s/.test(username)) e.username = "Sem espaços no nome de utilizador";
    if (!email.trim()) e.email = "Email obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Email inválido";
    if (!password) e.password = "Escolhe uma palavra-passe";
    else if (password.length < 6) e.password = "Mínimo 6 caracteres";
    if (confirm !== password) e.confirm = "As palavras-passe não coincidem";
    return e;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setLoading(true);
    const res = await registerUser({ username, password, displayName, email });
    setLoading(false);
    if (!res.ok) {
      setErrors({ email: res.error });
      return;
    }
    setSuccess(true);
    setNeedsConfirmation(!!res.needsConfirmation);
    if (!res.needsConfirmation) setTimeout(() => navigate({ to: "/home" }), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-orange-50 via-background to-blue-50">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <Card className="p-8 shadow-xl border-0">
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
                  className="mx-auto size-20 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg"
                >
                  <Check className="size-10" />
                </motion.div>
                <h2 className="mt-6 text-2xl font-bold">Conta criada com sucesso!</h2>
                <p className="mt-2 text-muted-foreground">Bem-vindo/a, {displayName}!</p>
                <p className="mt-4 text-sm text-muted-foreground">
                  {needsConfirmation
                    ? "Enviámos uma ligação para o teu email. Confirma a conta antes de entrar."
                    : "A preparar a tua experiência…"}
                </p>
                {needsConfirmation && (
                  <Link to="/login" className="mt-6 inline-flex font-semibold text-primary hover:underline">
                    Voltar ao login
                  </Link>
                )}
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="text-center mb-6">
                  <div className="mx-auto size-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-lg">
                    <UserPlus className="size-7" />
                  </div>
                  <h1 className="mt-4 text-2xl font-bold tracking-tight">Criar Conta Gratuita</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Junta-te à comunidade Ekaya Explore</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                  <Field
                    id="displayName" label="Nome completo" icon={UserIcon}
                    value={displayName} onChange={setDisplayName} error={errors.displayName}
                    placeholder="ex.: Ana Silva"
                  />
                  <Field
                    id="username" label="Nome de utilizador" icon={UserIcon}
                    value={username} onChange={(v) => setUsername(v.toLowerCase())} error={errors.username}
                    placeholder="ex.: ana_silva"
                  />
                  <Field
                    id="email" label="Email" icon={Mail} type="email"
                    value={email} onChange={setEmail} error={errors.email}
                    placeholder="ana@email.com"
                  />
                  <div>
                    <Label htmlFor="password">Palavra-passe</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="password" type={showPwd ? "text" : "password"}
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11" autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPwd((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                  </div>
                  <Field
                    id="confirm" label="Confirmar palavra-passe" icon={Lock} type={showPwd ? "text" : "password"}
                    value={confirm} onChange={setConfirm} error={errors.confirm}
                    placeholder="Repete a palavra-passe"
                  />

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="size-5 animate-spin" /> : <UserPlus className="size-5" />}
                    {loading ? "A criar..." : "Criar Conta"}
                  </motion.button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  Já tens conta?{" "}
                  <Link to="/login" className="text-orange-600 font-semibold hover:underline">Entrar</Link>
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

function Field({ id, label, icon: Icon, value, onChange, error, type = "text", placeholder }: FieldProps) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} className="pl-10 h-11"
        />
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
