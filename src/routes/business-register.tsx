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
  User as UserIcon,
  Lock,
  Mail,
  Check,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { registerBusinessAccount } from "@/lib/business-registration.functions";
import { useBusinessCategories, useProvinces } from "@/hooks/useProvinces";

export const Route = createFileRoute("/business-register")({
  head: () => ({
    meta: [
      { title: "Registar negócio — Ekaya Explore" },
      { name: "description", content: "Registra a tua banca, lodge ou serviço turístico e chega a viajantes em Moçambique." },
      { property: "og:title", content: "Registar negócio — Ekaya Explore" },
      { property: "og:description", content: "Registra a tua banca, lodge ou serviço turístico e chega a viajantes em Moçambique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusinessRegisterPage,
});

// Categories and provinces now come from the database (business_categories / provinces).


function BusinessRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [businessType, setBusinessType] = useState<"small" | "large" | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  // form state
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [location, setLocation] = useState("");
  const { provinces, loading: loadingProvinces } = useProvinces();
  const { categories, loading: loadingCategories } = useBusinessCategories();
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const gradient = businessType === "large" ? "from-blue-500 to-blue-700" : "from-orange-500 to-orange-600";
  const badgeColor = businessType === "large" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700";

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigate({ to: "/login" });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!businessType) return;
    if (!businessName || !category || !provinceCode || !location || !description || !contact || !ownerName || !email || !password) {
      toast.error("Preenche todos os campos obrigatórios");
      return;
    }
    if (password.length < 6) {
      toast.error("A palavra-passe deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As palavras-passe não coincidem");
      return;
    }

    setSubmitting(true);
    const result = await registerBusinessAccount({
      data: {
        businessName,
        businessType,
        category,
        provinceCode,
        location,
        description,
        contact,
        displayName: ownerName,
        email,
        password,
      },
    }).catch(() => ({ ok: false, error: "Sem ligação. Tenta novamente." }) as const);

    if (!result.ok) {
      setSubmitting(false);
      toast.error(result.error ?? "Não foi possível registar");
      return;
    }

    // The password only ever reaches Supabase Auth; here it just opens the session.
    if (!result.needsConfirmation) {
      await supabase.auth.signInWithPassword({ email: email.trim(), password });
    }
    setNeedsConfirmation(!!result.needsConfirmation);
    setSubmitting(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-teal-50 via-white to-blue-50">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="mx-auto size-24 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg"
          >
            <Check className="size-12" />
          </motion.div>
          <h1 className="mt-6 text-3xl font-bold">Sucesso!</h1>
          <p className="mt-2 text-gray-600">O teu negócio foi criado.</p>

          <div className="mt-6 flex items-start gap-3 text-left rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <Shield className="size-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Aguardando Verificação</p>
              <p className="text-sm text-blue-800 mt-1">
                {needsConfirmation
                  ? "Enviámos uma ligação para o teu email: confirma a conta para entrares. Um administrador irá rever e aprovar o teu negócio em breve."
                  : "Um administrador irá rever e aprovar o teu negócio em breve. Podes começar a configurar o teu perfil enquanto isso."}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate({ to: needsConfirmation ? "/login" : "/business-dashboard" })}
            className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-blue-500 text-white font-semibold shadow-lg hover:opacity-95 transition"
          >
            {needsConfirmation ? "Ir para o login" : "Ir para Dashboard"}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="size-4" /> Voltar
          </button>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-12 rounded-full transition ${step >= 1 ? "bg-teal-500" : "bg-gray-200"}`} />
            <div className={`h-2 w-12 rounded-full transition ${step >= 2 ? "bg-teal-500" : "bg-gray-200"}`} />
          </div>
          <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">
            Entrar
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-10 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
          className="mx-auto size-20 rounded-2xl bg-gradient-to-br from-teal-500 to-blue-500 text-white flex items-center justify-center shadow-xl"
        >
          <Store className="size-10" />
        </motion.div>
        <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">Registe o Seu Negócio</h1>
        <p className="mt-2 text-gray-600">Junte-se à rede de turismo comunitário de Moçambique</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
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
                className="text-left bg-white shadow-xl rounded-2xl p-8 border-2 border-transparent hover:border-teal-500 transition"
              >
                <div className="size-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center">
                  <Building2 className="size-8" />
                </div>
                <h3 className="mt-4 text-xl font-bold">Negócio Grande</h3>
                <p className="mt-1 text-gray-600 text-sm">
                  Lodges, restaurantes, bares, agências de turismo
                </p>
                <div className="mt-4 flex items-center gap-2 text-teal-600 font-semibold">
                  <Sparkles className="size-4" /> Selecionar
                </div>
              </motion.button>

              <motion.button
                whileHover={{ y: -5 }}
                onClick={() => {
                  setBusinessType("small");
                  setStep(2);
                }}
                className="text-left bg-white shadow-xl rounded-2xl p-8 border-2 border-transparent hover:border-orange-500 transition"
              >
                <div className="size-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center">
                  <ShoppingBag className="size-8" />
                </div>
                <h3 className="mt-4 text-xl font-bold">Negócio Pequeno</h3>
                <p className="mt-1 text-gray-600 text-sm">
                  Bancas, vendedores ambulantes, artesãos
                </p>
                <div className="mt-4 flex items-center gap-2 text-orange-600 font-semibold">
                  <Sparkles className="size-4" /> Selecionar
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
              className="bg-white shadow-xl rounded-3xl p-8"
            >
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badgeColor}`}>
                {businessType === "large" ? "Negócio Grande" : "Negócio Pequeno"}
              </span>

              <h2 className="mt-4 text-xl font-bold">Informações do Negócio</h2>
              <div className="mt-4 grid gap-4">
                <Field icon={<Store className="size-4" />} label="Nome do Negócio *">
                  <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} required />
                </Field>
                <Field icon={<Tag className="size-4" />} label="Categoria *">
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} required>
                    <option value="">{loadingCategories ? "A carregar..." : "Selecionar..."}</option>
                    {categories.map((c) => (
                      <option key={c.code} value={c.code}>{c.name.pt}</option>
                    ))}
                  </select>
                </Field>
                <Field icon={<MapPin className="size-4" />} label="Província *">
                  <select value={provinceCode} onChange={(e) => setProvinceCode(e.target.value)} className={inputClass} required>
                    <option value="">{loadingProvinces ? "A carregar..." : "Selecionar..."}</option>
                    {provinces.map((p) => (
                      <option key={p.id} value={p.code}>{p.name.pt}</option>
                    ))}
                  </select>
                </Field>
                <Field icon={<MapPin className="size-4" />} label="Cidade / Localização *">
                  <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} required />
                </Field>
                <Field icon={<FileText className="size-4" />} label="Descrição *">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClass} required />
                </Field>
                <Field icon={<Phone className="size-4" />} label="Contacto *">
                  <input type="tel" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+258 84 123 4567" className={inputClass} required />
                </Field>
              </div>

              <div className="my-8 flex items-center gap-3 text-xs text-gray-500">
                <div className="h-px bg-gray-200 flex-1" /> CREDENCIAIS DE ACESSO <div className="h-px bg-gray-200 flex-1" />
              </div>

              <div className="grid gap-4">
                <Field icon={<UserIcon className="size-4" />} label="Nome do Responsável *">
                  <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputClass} required />
                </Field>
                <Field icon={<Mail className="size-4" />} label="Email *">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="email" required />
                </Field>
                <Field icon={<Lock className="size-4" />} label="Palavra-passe (mín. 6) *">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} autoComplete="new-password" required minLength={6} />
                </Field>
                <Field icon={<Lock className="size-4" />} label="Confirmar Palavra-passe *">
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} autoComplete="new-password" required minLength={6} />
                </Field>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`mt-8 w-full py-4 rounded-xl bg-gradient-to-r ${gradient} text-white font-semibold shadow-lg hover:opacity-95 transition disabled:opacity-70`}
              >
                {submitting ? "A registar..." : "Registar Negócio"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition";

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
        <span className="text-teal-600">{icon}</span> {label}
      </span>
      {children}
    </label>
  );
}
