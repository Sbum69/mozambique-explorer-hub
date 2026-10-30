import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { InterestIcon } from "@/components/InterestIcon";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { INTERESTS } from "@/data/destinations";
import { useDestinations } from "@/hooks/useDestinations";
import { useProvinces } from "@/hooks/useProvinces";
import { Check, ChevronLeft, ChevronRight, MapPin, Star, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  /** Current preferences, so editing starts from what the user already chose. */
  initial?: {
    province?: string;
    provinces?: string[];
    durationDays?: number;
    interests?: string[];
  };
}

export function OnboardingModal({ open, onComplete, initial }: OnboardingModalProps) {
  const { setPreferences } = useAuth();
  const { t, lang } = useLang();
  const {
    destinations,
    loading: loadingDestinations,
    error: destinationsError,
    isEmpty,
    reload,
  } = useDestinations();
  const { provinces, loading: loadingProvinces } = useProvinces();
  const [step, setStep] = useState(0);
  /** Featured destination slug (optional, kept for the existing profiles.province field). */
  const [province, setProvince] = useState<string | null>(initial?.province ?? null);
  /** The ONE destination province (provinces.code). */
  const [provinceCode, setProvinceCode] = useState<string | null>(initial?.provinces?.[0] ?? null);
  const [days, setDays] = useState(initial?.durationDays ?? 7);
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);

  // Saved preferences may arrive after the first render (profile still loading): adopt them once.
  const initialCode = initial?.provinces?.[0];
  const initialSlug = initial?.province;
  useEffect(() => {
    if (initialCode) setProvinceCode((c) => c ?? initialCode);
    if (initialSlug) setProvince((c) => c ?? initialSlug);
  }, [initialCode, initialSlug]);
  const initialDays = initial?.durationDays;
  const initialInterests = initial?.interests?.join(",");
  const syncedRest = useRef(false);
  useEffect(() => {
    if (syncedRest.current || (initialDays == null && !initialInterests)) return;
    syncedRest.current = true;
    if (initialDays != null) setDays(initialDays);
    if (initialInterests) setInterests(initialInterests.split(","));
  }, [initialDays, initialInterests]);

  // Older profiles only have the destination slug: derive its province once destinations load.
  useEffect(() => {
    if (provinceCode || !province) return;
    const d = destinations.find((x) => x.slug === province);
    if (d?.province) setProvinceCode(d.province);
  }, [destinations, province, provinceCode]);

  const totalSteps = 3;

  const canNext = step === 0 ? !!provinceCode : step === 1 ? days >= 1 : interests.length >= 2;

  const [saving, setSaving] = useState(false);

  const savePrefs = async (
    prefs: { durationDays: number; interests: string[] },
    code = provinceCode,
  ) => {
    if (!code) return;
    const provinceCode_ = code;
    // profiles.province keeps a destination slug when the chosen province has one; otherwise the province code.
    const slug =
      (province &&
        destinations.find((d) => d.slug === province && d.province === provinceCode_)?.slug) ??
      destinations.find((d) => d.province === provinceCode_)?.slug ??
      provinceCode_;
    setSaving(true);
    try {
      await setPreferences({ ...prefs, province: slug, provinces: [provinceCode_] });
    } catch {
      // Nothing was saved (all-or-nothing on the server): keep the dialog open so the user can retry.
      toast.error(
        lang === "pt"
          ? "Não foi possível guardar as preferências. Tenta novamente."
          : "Couldn't save your preferences. Please try again.",
      );
      return;
    } finally {
      setSaving(false);
    }
    onComplete();
  };

  /** Single choice: picking a province replaces the previous one. */
  const pickProvince = (code: string) => {
    setProvinceCode(code);
    setProvince((cur) =>
      cur && destinations.find((d) => d.slug === cur)?.province === code ? cur : null,
    );
  };
  const pickDestination = (slug: string, code?: string | null) => {
    setProvince(slug);
    if (code) setProvinceCode(code);
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      void savePrefs({ durationDays: days, interests });
    }
  };

  const handleSkip = () => {
    // Existing skip behaviour: keep the current choice, else the first destination's province.
    const code = provinceCode ?? destinations[0]?.province ?? null;
    if (!code) return;
    void savePrefs({ durationDays: 3, interests: [] }, code);
  };

  const toggleInterest = (id: string) => {
    setInterests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-0 bg-card [&>button]:hidden">
        {/* Header */}
        <div className="px-6 sm:px-10 pt-8 pb-4 bg-muted">
          <div className="flex items-center justify-between gap-3 mb-3">
            <Badge variant="outline" className="bg-card font-medium">
              {t("step")} {step + 1} {t("of")} {totalSteps}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              {t("skip")}
            </Button>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("personalize")}</h2>
          <p className="text-muted-foreground mt-2">{t("personalizeSub")}</p>
          {/* Progress */}
          <div className="mt-5 flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-500",
                  i <= step ? "bg-primary" : "bg-border",
                )}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 sm:px-10 py-8 min-h-[420px]">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="dest"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
                  <MapPin className="size-5 text-primary" /> {t("chooseDestination")}
                </h3>
                {loadingDestinations && (
                  <p className="text-sm text-muted-foreground animate-pulse">
                    {lang === "pt" ? "A carregar destinos..." : "Loading destinations..."}
                  </p>
                )}
                {destinationsError && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {lang === "pt"
                        ? "Não foi possível carregar os destinos. Verifica a ligação e tenta novamente."
                        : "We couldn't load the destinations. Check your connection and try again."}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => void reload()}>
                      {lang === "pt" ? "Tentar novamente" : "Try again"}
                    </Button>
                  </div>
                )}
                {isEmpty && (
                  <p className="text-sm text-muted-foreground">
                    {lang === "pt"
                      ? "Ainda não existem destinos disponíveis."
                      : "No destinations available yet."}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {destinations.map((d, i) => {
                    const selected =
                      !!provinceCode && province === d.slug && provinceCode === d.province;
                    return (
                      <motion.button
                        key={d.id}
                        type="button"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => pickDestination(d.slug, d.province)}
                        aria-pressed={selected}
                        className={cn(
                          "group relative text-left rounded-[10px] overflow-hidden border-2 transition-all duration-300 bg-card",
                          selected
                            ? "border-primary shadow-[var(--shadow-elegant)]"
                            : "border-border hover:border-primary/40 shadow-[var(--shadow-soft)]",
                        )}
                      >
                        <div className="relative h-36 overflow-hidden">
                          <img
                            src={d.image}
                            alt={d.name}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                          <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                            {d.badges.includes("most-recommended") && (
                              <Badge className="bg-warning text-warning-foreground gap-1 border-0">
                                <Star className="size-3 fill-current" /> {t("mostRecommended")}
                              </Badge>
                            )}
                            {d.badges.includes("most-visited") && (
                              <Badge className="bg-secondary text-secondary-foreground gap-1 border-0">
                                <TrendingUp className="size-3" /> {t("mostVisited")}
                              </Badge>
                            )}
                          </div>
                          {selected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[var(--shadow-soft)]"
                            >
                              <Check className="size-4" />
                            </motion.div>
                          )}
                          <div className="absolute bottom-2 left-3 right-3 text-white">
                            <p className="font-bold text-lg leading-tight">{d.name}</p>
                            <p className="text-xs opacity-90">{d.region[lang]}</p>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {d.description[lang]}
                          </p>
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="size-3" />
                            <span className="font-semibold text-foreground">{d.visitorsK}k</span>
                            <span>{t("visitorsYear")}</span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Destination province: exactly one, chosen directly from the real province list */}
                <div className="mt-8">
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="size-4 text-primary" />
                    {lang === "pt"
                      ? "Ou escolhe diretamente a província de destino"
                      : "Or pick your destination province directly"}
                  </h3>
                  {loadingProvinces ? (
                    <p className="text-sm text-muted-foreground animate-pulse">
                      {lang === "pt" ? "A carregar províncias..." : "Loading provinces..."}
                    </p>
                  ) : (
                    <div
                      className="flex flex-wrap gap-2"
                      role="radiogroup"
                      aria-label={lang === "pt" ? "Província de destino" : "Destination province"}
                    >
                      {provinces.map((p) => {
                        const selected = provinceCode === p.code;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => pickProvince(p.code)}
                            role="radio"
                            aria-checked={selected}
                            className={cn(
                              "rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-colors",
                              selected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/40 text-muted-foreground",
                            )}
                          >
                            {p.name[lang]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="days"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-xl mx-auto pt-8"
              >
                <h3 className="text-xl font-semibold mb-8 text-center">{t("duration")}</h3>
                <div className="text-center mb-10">
                  <motion.div
                    key={days}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex flex-col items-center"
                  >
                    <span className="text-7xl sm:text-8xl font-bold bg-primary text-primary-foreground bg-clip-text text-transparent">
                      {days}
                    </span>
                    <span className="text-lg text-muted-foreground font-medium mt-1">
                      {days === 1 ? t("day") : t("days")}
                    </span>
                  </motion.div>
                </div>
                <Slider
                  value={[days]}
                  onValueChange={(v) => setDays(v[0])}
                  min={1}
                  max={30}
                  step={1}
                  className="mb-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground font-medium px-1">
                  <button
                    type="button"
                    onClick={() => setDays(2)}
                    className="hover:text-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    2 {t("days")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDays(7)}
                    className="hover:text-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {lang === "pt" ? "1 sem" : "1 wk"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDays(14)}
                    className="hover:text-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {lang === "pt" ? "2 sem" : "2 wks"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDays(30)}
                    className="hover:text-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {lang === "pt" ? "1 mês" : "1 month"}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="interests"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-semibold mb-1">{t("interests")}</h3>
                <p className="text-sm text-muted-foreground mb-6">{t("interestsSub")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {INTERESTS.map((it, i) => {
                    const selected = interests.includes(it.id);
                    return (
                      <motion.button
                        key={it.id}
                        type="button"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => toggleInterest(it.id)}
                        className={cn(
                          "relative rounded-[10px] p-4 border-2 transition-all duration-300 text-left",
                          selected
                            ? "border-primary bg-primary/5 shadow-[var(--shadow-soft)]"
                            : "border-border hover:border-primary/40 bg-card",
                        )}
                      >
                        <InterestIcon id={it.id} className="size-7 mb-2 text-primary" />
                        <p className="text-sm font-semibold leading-tight">{t(it.labelKey)}</p>
                        {selected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                          >
                            <Check className="size-3" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                {interests.length > 0 && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {interests.length} {interests.length === 1 ? "selecionado" : "selecionados"}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-10 py-5 border-t bg-muted/30 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronLeft className="size-4" /> {t("back")}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canNext || saving}
            size="lg"
            className="gap-1.5 bg-primary text-primary-foreground shadow-[var(--shadow-elegant)] hover:opacity-95 transition-all"
          >
            {step === totalSteps - 1 ? t("confirm") : t("next")}
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
