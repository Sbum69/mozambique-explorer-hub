import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bell,
  Download,
  Info,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Palette,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AppSidebar } from "@/components/AppSidebar";
import { OnboardingModal } from "@/components/OnboardingModal";
import { UserAvatar, UserMenu } from "@/components/UserMenu";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLang, type Lang } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useProvinces } from "@/hooks/useProvinces";
import { INTERESTS } from "@/data/destinations";
import { supabase } from "@/integrations/supabase/client";
import { exportMyData } from "@/lib/account.functions";
import { APP_VERSION, SUPPORT_EMAIL } from "@/lib/app-info";
import { getAuthCallbackUrl } from "@/lib/app-url";
import { requireAuthenticatedUser } from "@/lib/auth";
import { MFA_TXT, PHOTOS_TXT, SETTINGS_TXT } from "@/lib/page-texts";
import { MfaSettings } from "@/components/MfaSettings";
import type { ThemePreference } from "@/lib/theme";

export const Route = createFileRoute("/settings")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { mfa?: "required" } =>
    search.mfa === "required" ? { mfa: "required" } : {},
  beforeLoad: requireAuthenticatedUser,
  head: () => ({
    meta: [{ title: "Definições — Ekaya Explore" }, { name: "robots", content: "noindex" }],
  }),
  component: SettingsPage,
});

const AVATAR_BUCKET = "avatars";
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHONE_RE = /^\+?[0-9][0-9 -]{6,19}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** In-app notification groups the user may switch off; bookings and safety/platform stay on. */
const MUTABLE_GROUPS = [
  { key: "community", types: ["community", "experience"] },
  { key: "routes", types: ["route", "itinerary"] },
  { key: "news", types: ["promo", "event", "reward"] },
] as const;

type Txt = (typeof SETTINGS_TXT)[Lang];

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20 p-5 sm:p-6 space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Icon className="size-5 text-primary" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </Card>
  );
}

/** Storage path of an avatar public URL ("<uid>/<file>"), or null for anything else. */
function avatarPath(url: string | undefined): string | null {
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const at = url?.indexOf(marker) ?? -1;
  return url && at >= 0 ? decodeURIComponent(url.slice(at + marker.length)) : null;
}

function SettingsPage() {
  const { lang } = useLang();
  const t = SETTINGS_TXT[lang];
  const { user, authUser, isAdmin, isBusiness } = useAuth();
  const mfaRequired = Route.useSearch().mfa === "required";

  // Opened from the user menu's "Profile": scroll to that section once the page is there.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  if (!user || !authUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" aria-label={t.saving} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <AppSidebar />
            <Button asChild variant="ghost" size="icon" aria-label={t.back}>
              <Link to="/home">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <h1 className="min-w-0 truncate font-bold text-base sm:text-lg ml-1">{t.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <NotificationsBell />
            <ThemeToggle />
            <LanguageToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <p className="text-muted-foreground">{t.subtitle}</p>
        <ProfileSection t={t} />
        <AccountSection t={t} />
        <Section id="security" icon={ShieldCheck} title={MFA_TXT[lang].title}>
          <MfaSettings required={mfaRequired} />
        </Section>
        <PreferencesSection t={t} />
        <AppearanceSection t={t} />
        <NotificationsSection t={t} />
        <PrivacySection t={t} />
        {(isBusiness || isAdmin) && (
          <Section id="shortcuts" icon={SlidersHorizontal} title={t.sectionShortcuts}>
            <div className="flex flex-wrap gap-2">
              {isBusiness && (
                <Button asChild variant="outline" className="gap-2">
                  <Link to="/business-dashboard" search={{ status: "all" }}>
                    <Store className="size-4" aria-hidden="true" />
                    {t.menuBusiness}
                  </Link>
                </Button>
              )}
              {isAdmin && (
                <Button asChild variant="outline" className="gap-2">
                  <Link to="/admin">
                    <Shield className="size-4" aria-hidden="true" />
                    {t.menuAdmin}
                  </Link>
                </Button>
              )}
            </div>
          </Section>
        )}
        <Section id="about" icon={Info} title={t.sectionAbout}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t.version}</dt>
            <dd>{APP_VERSION}</dd>
            <dt className="text-muted-foreground">{t.terms}</dt>
            <dd>
              <Link to="/terms" className="text-primary underline-offset-4 hover:underline">
                {t.readDraft}
              </Link>
            </dd>
            <dt className="text-muted-foreground">{t.privacy}</dt>
            <dd>
              <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
                {t.readDraft}
              </Link>
            </dd>
            <dt className="text-muted-foreground">{t.contact}</dt>
            <dd className="min-w-0 break-words">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </dd>
            <dt className="text-muted-foreground">{PHOTOS_TXT[lang].credits}</dt>
            <dd>
              <Link to="/creditos" className="text-primary underline-offset-4 hover:underline">
                {PHOTOS_TXT[lang].creditsTitle}
              </Link>
            </dd>
          </dl>
        </Section>
      </main>
    </div>
  );
}

function ProfileSection({ t }: { t: Txt }) {
  const { user, authUser, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.displayName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!user || !authUser) return null;
  const uid = authUser.id;

  const save = async () => {
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (cleanName.length < 2 || cleanName.length > 80) return toast.error(t.displayNameError);
    if (cleanPhone && !PHONE_RE.test(cleanPhone)) return toast.error(t.phoneError);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: cleanName, phone: cleanPhone || null })
      .eq("id", uid);
    setSaving(false);
    if (error) return toast.error(t.saveError);
    await refreshProfile();
    toast.success(t.saved);
  };

  const setAvatar = async (url: string | null) => {
    const old = avatarPath(user.avatarUrl);
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", uid);
    if (error) throw error;
    if (old) await supabase.storage.from(AVATAR_BUCKET).remove([old]);
    await refreshProfile();
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) return toast.error(t.photoWrongType);
    if (file.size > AVATAR_MAX_BYTES) return toast.error(t.photoTooBig);
    setUploading(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${uid}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      await setAvatar(data.publicUrl);
      toast.success(t.saved);
    } catch {
      toast.error(t.photoError);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = async () => {
    setUploading(true);
    try {
      await setAvatar(null);
      toast.success(t.saved);
    } catch {
      toast.error(t.saveError);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Section id="profile" icon={UserRound} title={t.sectionProfile}>
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar name={user.displayName} url={user.avatarUrl} size="lg" />
        <div className="space-y-2">
          <p className="text-sm font-medium">{t.photo}</p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={AVATAR_TYPES.join(",")}
              className="sr-only"
              id="avatar-file"
              onChange={(e) => void upload(e.target.files?.[0])}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t.photoChange}
            </Button>
            {user.avatarUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={uploading}
                onClick={() => void removePhoto()}
              >
                {t.photoRemove}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t.photoHint}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="settings-name">{t.displayName}</Label>
          <Input
            id="settings-name"
            value={name}
            maxLength={80}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-phone">{t.phone}</Label>
          <Input
            id="settings-phone"
            type="tel"
            value={phone}
            maxLength={20}
            autoComplete="tel"
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t.phoneHint}</p>
        </div>
      </div>
      <Button onClick={() => void save()} disabled={saving}>
        {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {saving ? t.saving : t.save}
      </Button>
    </Section>
  );
}

function AccountSection({ t }: { t: Txt }) {
  const { user, authUser } = useAuth();
  const { lang } = useLang();
  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  if (!user || !authUser) return null;

  const roleLabel =
    user.role === "admin"
      ? t.roleAdmin
      : user.role === "business-small" || user.role === "business-large"
        ? t.roleBusiness
        : t.roleTourist;
  const joined = new Date(authUser.created_at).toLocaleDateString(
    lang === "pt" ? "pt-PT" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );

  const changeEmail = async () => {
    const next = email.trim().toLowerCase();
    if (!EMAIL_RE.test(next)) return toast.error(t.emailInvalid);
    setEmailBusy(true);
    const { error } = await supabase.auth.updateUser(
      { email: next },
      { emailRedirectTo: getAuthCallbackUrl() },
    );
    setEmailBusy(false);
    if (error) return toast.error(t.emailError);
    setEmail("");
    toast.success(t.emailSent);
  };

  const changePassword = async () => {
    if (pw.next.length < 6) return toast.error(t.passwordShort);
    if (pw.next !== pw.confirm) return toast.error(t.passwordMismatch);
    setPwBusy(true);
    try {
      // The current password is checked by signing in with it again (same account).
      const check = await supabase.auth.signInWithPassword({
        email: authUser.email ?? "",
        password: pw.current,
      });
      if (check.error) return toast.error(t.passwordWrong);
      const { error } = await supabase.auth.updateUser({ password: pw.next });
      if (error) return toast.error(t.passwordError);
      setPw({ current: "", next: "", confirm: "" });
      toast.success(t.passwordChanged);
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <Section id="account" icon={KeyRound} title={t.sectionAccount}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t.email}</dt>
        <dd className="break-all">{authUser.email}</dd>
        <dt className="text-muted-foreground">{t.role}</dt>
        <dd>{roleLabel}</dd>
        <dt className="text-muted-foreground">{t.memberSince}</dt>
        <dd>{joined}</dd>
      </dl>

      <div className="space-y-1.5">
        <Label htmlFor="settings-email">{t.newEmail}</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="settings-email"
            type="email"
            autoComplete="email"
            className="flex-1 min-w-[200px]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            variant="outline"
            className="gap-2"
            disabled={emailBusy || !email.trim()}
            onClick={() => void changeEmail()}
          >
            <Mail className="size-4" aria-hidden="true" />
            {t.changeEmail}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["current", t.currentPassword, "current-password"],
            ["next", t.newPassword, "new-password"],
            ["confirm", t.confirmPassword, "new-password"],
          ] as const
        ).map(([key, label, autoComplete]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`settings-pw-${key}`}>{label}</Label>
            <Input
              id={`settings-pw-${key}`}
              type="password"
              autoComplete={autoComplete}
              value={pw[key]}
              onChange={(e) => setPw((cur) => ({ ...cur, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        disabled={pwBusy || !pw.current || !pw.next}
        onClick={() => void changePassword()}
      >
        {pwBusy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {t.changePassword}
      </Button>
    </Section>
  );
}

function PreferencesSection({ t }: { t: Txt }) {
  const { user } = useAuth();
  const { lang, t: dict } = useLang();
  const { provinces } = useProvinces();
  const [editing, setEditing] = useState(false);
  const prefs = user?.preferences;
  const provinceNames = (prefs?.provinces ?? [])
    .map((code) => provinces.find((p) => p.code === code)?.name[lang] ?? code)
    .join(", ");
  const interestNames = (prefs?.interests ?? [])
    .map((id) => {
      const meta = INTERESTS.find((i) => i.id === id);
      return meta ? dict(meta.labelKey) : id;
    })
    .join(", ");

  return (
    <Section id="preferences" icon={SlidersHorizontal} title={t.sectionPrefs}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t.prefsProvince}</dt>
        <dd>{provinceNames || t.prefsNone}</dd>
        <dt className="text-muted-foreground">{t.prefsDays}</dt>
        <dd>{prefs?.durationDays ? t.days(prefs.durationDays) : t.prefsNone}</dd>
        <dt className="text-muted-foreground">{t.prefsInterests}</dt>
        <dd>{interestNames || t.prefsNone}</dd>
      </dl>
      <Button variant="outline" onClick={() => setEditing(true)}>
        {t.prefsEdit}
      </Button>
      {editing && (
        <OnboardingModal
          open
          initial={{
            province: prefs?.province,
            provinces: prefs?.provinces,
            durationDays: prefs?.durationDays,
            interests: prefs?.interests,
          }}
          onComplete={() => setEditing(false)}
        />
      )}
    </Section>
  );
}

function AppearanceSection({ t }: { t: Txt }) {
  const { preference, setPreference } = useTheme();
  const { lang, setLang } = useLang();
  const themes: [ThemePreference, string][] = [
    ["light", t.themeLight],
    ["dark", t.themeDark],
    ["system", t.themeSystem],
  ];
  const langs: [Lang, string][] = [
    ["pt", "Português"],
    ["en", "English"],
  ];

  return (
    <Section id="appearance" icon={Palette} title={t.sectionAppearance}>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium mb-2">{t.theme}</legend>
        <RadioGroup
          value={preference}
          onValueChange={(v) => setPreference(v as ThemePreference)}
          className="flex flex-wrap gap-4"
        >
          {themes.map(([value, label]) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem id={`theme-${value}`} value={value} />
              <Label htmlFor={`theme-${value}`}>{label}</Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium mb-2">{t.language}</legend>
        <RadioGroup
          value={lang}
          onValueChange={(v) => setLang(v as Lang)}
          className="flex flex-wrap gap-4"
        >
          {langs.map(([value, label]) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem id={`lang-${value}`} value={value} />
              <Label htmlFor={`lang-${value}`} lang={value}>
                {label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>
    </Section>
  );
}

function NotificationsSection({ t }: { t: Txt }) {
  const { authUser } = useAuth();
  const uid = authUser?.id;
  const [muted, setMuted] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    supabase
      .from("profiles")
      .select("muted_notification_types")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setFailed(true);
        else setMuted(data?.muted_notification_types ?? []);
      });
    return () => {
      active = false;
    };
  }, [uid]);

  const toggle = async (types: readonly string[], on: boolean) => {
    if (!uid || !muted) return;
    const next = on ? muted.filter((x) => !types.includes(x)) : [...new Set([...muted, ...types])];
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ muted_notification_types: next })
      .eq("id", uid);
    setBusy(false);
    if (error) return toast.error(t.saveError);
    setMuted(next);
  };

  const labels: Record<(typeof MUTABLE_GROUPS)[number]["key"], [string, string]> = {
    community: [t.notifCommunity, t.notifCommunityHint],
    routes: [t.notifRoutes, t.notifRoutesHint],
    news: [t.notifNews, t.notifNewsHint],
  };
  const locked: [string, string][] = [
    [t.notifBookings, t.notifBookingsHint],
    [t.notifSafety, t.notifSafetyHint],
  ];

  return (
    <Section id="notifications" icon={Bell} title={t.sectionNotifications}>
      <p className="text-sm text-muted-foreground">{t.notificationsHint}</p>
      {failed ? (
        <p className="text-sm text-destructive">{t.saveError}</p>
      ) : !muted ? (
        <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
      ) : (
        <ul className="divide-y divide-border">
          {locked.map(([label, hint]) => (
            <li key={label} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-sm text-muted-foreground">{hint}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3.5" aria-hidden="true" />
                {t.alwaysOn}
              </span>
            </li>
          ))}
          {MUTABLE_GROUPS.map((g) => {
            const [label, hint] = labels[g.key];
            const on = !g.types.some((x) => muted.includes(x));
            return (
              <li key={g.key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium" id={`notif-${g.key}`}>
                    {label}
                  </p>
                  <p className="text-sm text-muted-foreground">{hint}</p>
                </div>
                <Switch
                  checked={on}
                  disabled={busy}
                  aria-labelledby={`notif-${g.key}`}
                  onCheckedChange={(v) => void toggle(g.types, v)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function PrivacySection({ t }: { t: Txt }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [askConfirm, confirmDialog] = useConfirm();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const download = async () => {
    setExporting(true);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ekaya-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t.exportError);
    } finally {
      setExporting(false);
    }
  };

  const remove = async () => {
    const answer = await askConfirm({
      title: t.deleteConfirmTitle,
      description: t.deleteHint,
      confirmLabel: t.deleteConfirm,
      destructive: true,
      reason: "required",
      reasonLabel: t.deleteConfirmHint,
    });
    if (!answer) return;
    if (answer.reason.trim().toUpperCase() !== t.deleteWord) return toast.error(t.errConfirm);
    setDeleting(true);
    try {
      // The photo is the user's own file: removed first (the account cannot do it afterwards).
      const photo = avatarPath(user?.avatarUrl);
      if (photo) await supabase.storage.from(AVATAR_BUCKET).remove([photo]);
      const { error } = await supabase.rpc("delete_my_account", { _confirm: t.deleteWord });
      if (error) {
        const known: Record<string, string> = {
          LAST_ADMIN: t.errLastAdmin,
          BUSINESS_HAS_FUTURE_BOOKINGS: t.errBusinessFuture,
          HAS_FUTURE_BOOKINGS: t.errFutureBookings,
          CONFIRMATION_REQUIRED: t.errConfirm,
        };
        return toast.error(known[error.message] ?? t.errDelete);
      }
      toast.success(t.deleteDone);
      await logout().catch(() => undefined);
      void navigate({ to: "/home", replace: true });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Section id="privacy" icon={Shield} title={t.sectionPrivacy}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t.exportTitle}</p>
          <p className="text-sm text-muted-foreground">{t.exportHint}</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          disabled={exporting}
          onClick={() => void download()}
        >
          {exporting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          {exporting ? t.exporting : t.exportButton}
        </Button>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3 border-t border-border pt-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t.deleteTitle}</p>
          <p className="text-sm text-muted-foreground">{t.deleteHint}</p>
        </div>
        <Button
          variant="destructive"
          className="gap-2"
          disabled={deleting}
          onClick={() => void remove()}
        >
          {deleting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="size-4" aria-hidden="true" />
          )}
          {deleting ? t.deleting : t.deleteButton}
        </Button>
      </div>
      {confirmDialog}
    </Section>
  );
}
