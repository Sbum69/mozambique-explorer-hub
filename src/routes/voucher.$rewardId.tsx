import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Gift, MapPin, Copy, Check, Sparkles, Info, Share2,
  Download, Instagram, Twitter, MessageCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";
import { requireAuthenticatedUser } from "@/lib/auth";

export const Route = createFileRoute("/voucher/$rewardId")({
  ssr: false,
  beforeLoad: requireAuthenticatedUser,
  head: () => ({
    meta: [
      { title: "Voucher resgatado — Ekaya Explore" },
      { name: "description", content: "A tua recompensa Ekaya foi resgatada com sucesso." },
      { property: "og:title", content: "Voucher resgatado — Ekaya Explore" },
      { property: "og:description", content: "A tua recompensa Ekaya foi resgatada com sucesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VoucherPage,
});

const REWARDS: Record<string, { title: { pt: string; en: string }; place: string; xp: number; perks: { pt: string; en: string }[] }> = {
  r1: { title: { pt: "10% em Experiências", en: "10% off Experiences" }, place: "Parceiros Ekaya", xp: 500, perks: [{ pt: "Desconto na próxima reserva", en: "Discount on next booking" }] },
  r2: { title: { pt: "Welcome Drink", en: "Welcome Drink" }, place: "Café & Sumos Naturais — Ilha Fresca", xp: 800, perks: [{ pt: "Sumo de manga ou maracujá (400ml)", en: "Mango or passion fruit juice (400ml)" }, { pt: "Café local Robusta torrado artesanalmente", en: "Local Robusta coffee, hand roasted" }] },
  r3: { title: { pt: "Passeio de Dhow Grátis", en: "Free Dhow Ride" }, place: "Vilankulo • Praia Principal", xp: 1500, perks: [{ pt: "Passeio de 2h ao pôr-do-sol", en: "2h sunset ride" }] },
  r4: { title: { pt: "Jantar Tradicional", en: "Traditional Dinner" }, place: "Banca da Maria — Maputo", xp: 2000, perks: [{ pt: "Prato principal + bebida tradicional", en: "Main course + traditional drink" }] },
  r5: { title: { pt: "Mergulho com Manta", en: "Manta Diving" }, place: "Tofo — Inhambane", xp: 3500, perks: [{ pt: "Mergulho guiado de 1 tank", en: "Guided 1-tank dive" }] },
  r6: { title: { pt: "Safari Gorongosa", en: "Gorongosa Safari" }, place: "Parque Nacional da Gorongosa", xp: 5000, perks: [{ pt: "Dia completo + guia local", en: "Full day + local guide" }] },
};

function VoucherPage() {
  const { rewardId } = useParams({ from: "/voucher/$rewardId" });
  const navigate = useNavigate();
  const { lang } = useLang();
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const reward = REWARDS[rewardId] ?? REWARDS.r2;

  const { voucherCode, voucherNumber, expiryDate } = useMemo(() => {
    const code = `EK-${rewardId.toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const num = `${Date.now()}`;
    const exp = new Date();
    exp.setDate(exp.getDate() + 30);
    return { voucherCode: code, voucherNumber: num, expiryDate: exp };
  }, [rewardId]);

  // Deterministic QR pattern based on code
  const qrCells = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < voucherCode.length; i++) seed = (seed * 31 + voucherCode.charCodeAt(i)) >>> 0;
    return Array.from({ length: 64 }, () => {
      seed = (seed * 1103515245 + 12345) >>> 0;
      return seed % 2 === 0;
    });
  }, [voucherCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(voucherCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-background dark:via-background dark:to-accent/10">
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-background/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b"
      >
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate({ to: "/gamification" })} className="flex items-center gap-2 text-sm font-medium hover:text-primary">
            <ArrowLeft className="size-5" />
            {lang === "pt" ? "Conquistas" : "Achievements"}
          </button>
          <h1 className="text-base sm:text-xl font-bold">{lang === "pt" ? "Voucher Resgatado" : "Voucher Redeemed"}</h1>
          <div className="w-6" />
        </div>
      </motion.header>

      {/* Success banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-4xl mx-auto px-4 sm:px-6 py-8"
      >
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, opacity: 1 }}
              animate={{ y: [0, 400], x: [0, (i % 2 === 0 ? -1 : 1) * (40 + i * 6)], rotate: [0, 360], opacity: [1, 0] }}
              transition={{ duration: 2, delay: (i % 5) * 0.1, repeat: Infinity, repeatDelay: 3 }}
              className="absolute w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: ["#fbbf24", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6"][i % 5],
                left: `${(i * 4) % 100}%`,
              }}
            />
          ))}
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.4 }}
              className="size-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 text-5xl"
            >
              🎉
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-2">
              {lang === "pt" ? "Parabéns!" : "Congratulations!"}
            </h2>
            <p className="text-lg text-green-50">
              {lang === "pt" ? "A tua recompensa foi resgatada com sucesso" : "Your reward has been redeemed"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Voucher card */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-3xl shadow-2xl overflow-hidden border-4 border-emerald-200 dark:border-emerald-900"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 size-64 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-emerald-100 text-xs font-medium mb-1 uppercase tracking-wider">Ekaya Explore</p>
                <h3 className="text-2xl sm:text-3xl font-bold truncate">{reward.title[lang]}</h3>
                <p className="text-emerald-100 text-sm sm:text-base">{reward.place}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">
                    {lang === "pt" ? "Recompensa" : "Reward"}
                  </div>
                  <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                    -{reward.xp} XP
                  </div>
                </div>
              </div>
              <div className="size-16 sm:size-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
                <Gift className="size-8 sm:size-10" />
              </div>
            </div>
          </div>

          {/* QR + barcode */}
          <div className="p-6 sm:p-8 border-b grid md:grid-cols-2 gap-8">
            <div className="text-center">
              <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                {lang === "pt" ? "QR para validação" : "QR for validation"}
              </p>
              <div className="size-56 mx-auto bg-white border-4 border-muted rounded-2xl flex items-center justify-center shadow-lg p-3">
                <div className="w-full h-full bg-gray-900 rounded-lg grid grid-cols-8 gap-[2px] p-2">
                  {qrCells.map((on, i) => (
                    <div key={i} className={on ? "bg-white" : "bg-black"} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {lang === "pt" ? "Apresenta este código no local" : "Show this code on site"}
              </p>
            </div>

            <div className="text-center">
              <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                {lang === "pt" ? "Código" : "Code"}
              </p>
              <div className="bg-white dark:bg-muted border-4 border-muted rounded-2xl p-5 shadow-lg">
                <div className="flex justify-center items-end gap-[2px] mb-4 h-24">
                  {voucherCode.split("").map((_, i) => (
                    <div
                      key={i}
                      className="bg-black dark:bg-white"
                      style={{ width: i % 2 === 0 ? "4px" : "2px", height: i % 3 === 0 ? "100%" : "75%" }}
                    />
                  ))}
                </div>
                <div className="font-mono text-base sm:text-lg font-bold tracking-widest text-foreground break-all">
                  {voucherCode}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCopy}
                  className="mt-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? (lang === "pt" ? "Copiado!" : "Copied!") : (lang === "pt" ? "Copiar código" : "Copy code")}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 font-mono">Nº: {voucherNumber}</p>
            </div>
          </div>

          {/* Where to redeem */}
          <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
            <h4 className="text-xl font-bold mb-5 flex items-center gap-2">
              <MapPin className="size-5 text-emerald-600" />
              {lang === "pt" ? "Onde resgatar" : "Where to redeem"}
            </h4>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <Info4 label={lang === "pt" ? "📍 Localização" : "📍 Location"} main={reward.place} sub={lang === "pt" ? "Piso térreo" : "Ground floor"} />
              <Info4 label={lang === "pt" ? "⏰ Horário" : "⏰ Hours"} main={lang === "pt" ? "Seg–Dom" : "Mon–Sun"} sub="07:00 – 19:00" />
              <Info4 label={lang === "pt" ? "📞 Contacto" : "📞 Contact"} main="+258 84 123 4567" sub={lang === "pt" ? "Ligar agora" : "Call now"} />
              <Info4 label={lang === "pt" ? "📅 Validade" : "📅 Valid until"} main={expiryDate.toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB")} sub={lang === "pt" ? "30 dias restantes" : "30 days left"} />
            </div>

            <div className="bg-card rounded-2xl p-5 border-2 border-emerald-100 dark:border-emerald-900">
              <h5 className="font-bold mb-3 flex items-center gap-2">
                <Sparkles className="size-4 text-emerald-600" />
                {lang === "pt" ? "O que está incluído" : "What's included"}
              </h5>
              <div className="space-y-2.5">
                {reward.perks.map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="size-6 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center shrink-0">
                      <Check className="size-3.5 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium">{p[lang]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* How to use */}
          <div className="p-6 sm:p-8 bg-blue-50 dark:bg-blue-950/20 border-t-2 border-blue-200 dark:border-blue-900">
            <h5 className="font-bold mb-4 flex items-center gap-2">
              <Info className="size-5 text-blue-600" />
              {lang === "pt" ? "Como usar o voucher" : "How to use the voucher"}
            </h5>
            <ol className="space-y-3 text-sm">
              {[
                lang === "pt" ? "Visita o local no horário de funcionamento" : "Visit during opening hours",
                lang === "pt" ? "Apresenta o QR Code ou código ao atendente" : "Show the QR code or barcode to the attendant",
                lang === "pt" ? "Aguarda a validação e aproveita!" : "Wait for validation and enjoy!",
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 size-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Actions */}
          <div className="p-6 sm:p-8 grid sm:grid-cols-2 gap-3">
            <Button
              onClick={() => setShowShare(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 h-12"
            >
              <Share2 className="size-4" /> {lang === "pt" ? "Partilhar voucher" : "Share voucher"}
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="h-12">
              <Download className="size-4" /> {lang === "pt" ? "Imprimir / Guardar" : "Print / Save"}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Share modal */}
      <AnimatePresence>
        {showShare && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShare(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-3xl shadow-2xl z-[101] max-w-md w-[92vw] p-6"
            >
              <h3 className="text-2xl font-bold text-center mb-1">
                {lang === "pt" ? "Partilhar Voucher" : "Share Voucher"}
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-5">
                {lang === "pt" ? "Convida amigos para esta experiência" : "Invite friends to this experience"}
              </p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <ShareBtn icon={Instagram} label="Instagram" gradient="from-pink-500 to-rose-600" />
                <ShareBtn icon={Twitter} label="Twitter" gradient="from-blue-400 to-blue-600" />
                <ShareBtn icon={MessageCircle} label="WhatsApp" gradient="from-green-500 to-emerald-600" />
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setShowShare(false)}>
                {lang === "pt" ? "Fechar" : "Close"}
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Info4({ label, main, sub }: { label: string; main: string; sub: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground mb-1">{label}</p>
      <p className="font-medium">{main}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function ShareBtn({ icon: Icon, label, gradient }: { icon: typeof Instagram; label: string; gradient: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`flex flex-col items-center gap-2 p-4 bg-gradient-to-br ${gradient} text-white rounded-xl shadow-lg`}
    >
      <Icon className="size-6" />
      <span className="text-xs font-semibold">{label}</span>
    </motion.button>
  );
}
