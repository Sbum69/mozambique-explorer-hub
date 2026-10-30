import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, FileUp, Link2, Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { ContentChecklist } from "@/components/ContentChecklist";
import { ContentPhotos } from "@/components/ContentPhotos";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { setExperienceActive } from "@/lib/admin";
import {
  IMPORT_COLUMNS,
  createInvite,
  csvToImportRows,
  fetchReadiness,
  importContent,
  inviteUrl,
  notReadyCodes,
  parseCsv,
  type ImportResult,
  type ImportRow,
} from "@/lib/content";
import { invalidateExperiencesCatalogue } from "@/hooks/useExperiences";
import { CONTENT_TXT } from "@/lib/page-texts";

type Txt = (typeof CONTENT_TXT)["pt"] | (typeof CONTENT_TXT)["en"];

interface BizRow {
  id: string;
  name: string;
  status: string;
  owner_id: string | null;
  province_id: string | null;
  description: string | null;
  location: { address?: string } | null;
  contact: { phone?: string; email?: string; whatsapp?: string } | null;
  images: string[] | null;
}

const EXAMPLE_ROWS = [
  [
    "negocio",
    "Exemplo — Banca do Mercado",
    "inhambane",
    "restaurant",
    "small",
    "Descrição do negócio com pelo menos vinte caracteres.",
    "Mercado Central",
    "+258 84 000 0000",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ],
  [
    "experiencia",
    "Exemplo — Banca do Mercado",
    "inhambane",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Almoço de exemplo",
    "Example lunch",
    "Descrição em português com pelo menos vinte caracteres.",
    "English description with at least twenty characters.",
    "food",
    "1000",
    "8",
    "2",
    "",
    "Mercado Central",
    "seg,qua,sab",
    "12:00",
    "14:00",
    "8",
  ],
];

function downloadTemplate() {
  const header = Object.keys(IMPORT_COLUMNS);
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [header, ...EXAMPLE_ROWS].map((r) => r.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "ekaya-modelo-importacao.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** Admin → Content: import as drafts, ready-to-publish lists, quick fixes, invites, activation. */
export function AdminContent() {
  const { lang } = useLang();
  const t = CONTENT_TXT[lang];
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState("");

  const list = useQuery({
    queryKey: ["admin-content"],
    queryFn: async () => {
      const [b, e] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, status, owner_id, province_id, description, location, contact, images")
          .order("name"),
        supabase.from("experiences").select("id, business_id, active"),
      ]);
      if (b.error) throw new Error(b.error.message);
      if (e.error) throw new Error(e.error.message);
      return { businesses: (b.data ?? []) as BizRow[], experiences: e.data ?? [] };
    },
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-content"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-content-readiness"] });
    invalidateExperiencesCatalogue();
  };

  const businesses = list.data?.businesses ?? [];
  const current = businesses.find((b) => b.id === selected) ?? null;

  return (
    <section className="space-y-6" aria-labelledby="admin-content-title">
      <div>
        <h2 id="admin-content-title" className="text-xl font-bold">
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>

      {list.isLoading ? (
        <p aria-busy="true">{t.loading}</p>
      ) : list.isError ? (
        <div role="alert" className="space-y-2">
          <p>{t.errLoad}</p>
          <Button variant="outline" onClick={() => void list.refetch()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {t.retry}
          </Button>
        </div>
      ) : (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label={t.summaryBusinesses} value={businesses.length} />
          <Stat
            label={`${t.summaryBusinesses} ${t.summaryApproved}`}
            value={businesses.filter((b) => b.status === "approved").length}
          />
          <Stat
            label={`${t.summaryBusinesses} ${t.summaryNoOwner}`}
            value={businesses.filter((b) => !b.owner_id).length}
          />
          <Stat
            label={`${t.summaryExperiences} ${t.summaryActive}`}
            value={list.data?.experiences.filter((e) => e.active).length ?? 0}
          />
        </dl>
      )}

      <ImportPanel t={t} onImported={refresh} />

      <Card className="p-4 sm:p-5 space-y-4">
        <h3 className="font-semibold">{t.readyTitle}</h3>
        <div className="space-y-1">
          <Label htmlFor="content-business">{t.selectBusiness}</Label>
          <select
            id="content-business"
            className="h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">—</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        {current && (
          <BusinessReadiness key={current.id} t={t} business={current} onChanged={refresh} />
        )}
      </Card>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-bold">{value}</dd>
    </div>
  );
}

function ImportPanel({ t, onImported }: { t: Txt; onImported: () => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [busy, setBusy] = useState<"check" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (file: File) => {
    setError(null);
    setResults(null);
    setBusy("check");
    try {
      const parsed = csvToImportRows(parseCsv(await file.text()));
      setRows(parsed.rows);
      setUnknown(parsed.unknownColumns);
      setResults(await importContent(parsed.rows, true));
    } catch {
      setError(t.errGeneric);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  const valid = useMemo(
    () => rows.filter((_, i) => results?.[i]?.status === "ok"),
    [rows, results],
  );

  const runImport = async () => {
    if (!valid.length) {
      setError(t.nothingToImport);
      return;
    }
    setBusy("import");
    setError(null);
    try {
      const done = await importContent(valid, false);
      const created = done.filter((r) => r.status === "created").length;
      toast.success(t.imported(created));
      setRows([]);
      setResults(null);
      await onImported();
    } catch {
      setError(t.errGeneric);
    } finally {
      setBusy(null);
    }
  };

  const statusLabel = (s: ImportResult["status"]) =>
    s === "ok"
      ? t.statusOk
      : s === "error"
        ? t.statusError
        : s === "duplicate"
          ? t.statusDuplicate
          : t.statusCreated;

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <h3 className="font-semibold">{t.importTitle}</h3>
      <p className="text-sm text-muted-foreground">{t.importIntro}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="size-4" aria-hidden="true" />
          {t.downloadTemplate}
        </Button>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          id="content-import-file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void choose(f);
          }}
        />
        <Button onClick={() => input.current?.click()} disabled={busy !== null}>
          {busy === "check" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileUp className="size-4" aria-hidden="true" />
          )}
          {busy === "check" ? t.checking : t.chooseFile}
        </Button>
      </div>
      {unknown.length > 0 && <p className="text-sm">{t.unknownColumns(unknown.join(", "))}</p>}
      {results && (
        <div className="space-y-3">
          <h4 className="font-medium">{t.preview}</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2 pr-3">{t.row}</th>
                  <th className="py-2 pr-3">{t.kind}</th>
                  <th className="py-2 pr-3">{t.businessLabel}</th>
                  <th className="py-2 pr-3">{t.status}</th>
                  <th className="py-2">{t.problems}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.row} className="border-b border-border align-top">
                    <td className="py-2 pr-3">{r.row + 1}</td>
                    <td className="py-2 pr-3">
                      {r.kind === "business"
                        ? t.kindBusiness
                        : r.kind === "experience"
                          ? t.kindExperience
                          : r.kind}
                    </td>
                    <td className="py-2 pr-3 break-words">
                      {rows[i]?.name ?? rows[i]?.business_name ?? ""}
                      {rows[i]?.title_pt ? ` — ${rows[i].title_pt}` : ""}
                    </td>
                    <td className="py-2 pr-3 font-medium">{statusLabel(r.status)}</td>
                    <td className="py-2">
                      {r.errors.map((e) => t.importErrors[e] ?? e).join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={() => void runImport()} disabled={busy !== null || !valid.length}>
            {busy === "import" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {busy === "import" ? t.importing : t.importValid(valid.length)}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </Card>
  );
}

function BusinessReadiness({
  t,
  business,
  onChanged,
}: {
  t: Txt;
  business: BizRow;
  onChanged: () => Promise<void>;
}) {
  const r = useQuery({
    queryKey: ["admin-content-readiness", business.id],
    queryFn: () => fetchReadiness(business.id),
  });
  const [bizEdit, setBizEdit] = useState(false);
  const [expEdit, setExpEdit] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const makeInvite = async () => {
    setBusy(true);
    try {
      setInvite(inviteUrl(window.location.origin, await createInvite(business.id)));
    } catch {
      toast.error(t.errGeneric);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, active: boolean) => {
    setBusy(true);
    try {
      await setExperienceActive(id, active);
      toast.success(active ? t.activated : t.deactivated);
      await r.refetch();
      await onChanged();
    } catch (e) {
      const codes = notReadyCodes(e instanceof Error ? e.message : "");
      toast.error(
        codes.length
          ? `${t.notReadyError} ${codes.map((c) => t.missing[c]).join(", ")}`
          : t.errGeneric,
      );
    } finally {
      setBusy(false);
    }
  };

  if (r.isLoading) return <p aria-busy="true">{t.loading}</p>;
  if (r.isError || !r.data)
    return (
      <div role="alert" className="space-y-2">
        <p>{t.errLoad}</p>
        <Button variant="outline" onClick={() => void r.refetch()}>
          {t.retry}
        </Button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setBizEdit(true)}>
          {t.edit}
        </Button>
        {!business.owner_id && (
          <Button variant="outline" onClick={() => void makeInvite()} disabled={busy}>
            <Link2 className="size-4" aria-hidden="true" />
            {t.invite}
          </Button>
        )}
      </div>
      <ContentChecklist
        readiness={r.data}
        onFixBusiness={() => setBizEdit(true)}
        onFixExperience={(id) => setExpEdit(id)}
        experienceActions={(e) => (
          <>
            <Button variant="outline" size="sm" onClick={() => setExpEdit(e.id)}>
              {t.edit}
            </Button>
            <Button
              size="sm"
              variant={e.active ? "outline" : "default"}
              disabled={busy || (!e.active && e.missing.length > 0)}
              onClick={() => void toggle(e.id, !e.active)}
            >
              {e.active ? t.deactivate : t.activate}
            </Button>
          </>
        )}
      />

      <Dialog open={!!invite} onOpenChange={(o) => !o && setInvite(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.inviteTitle}</DialogTitle>
            <DialogDescription>{t.inviteBody}</DialogDescription>
          </DialogHeader>
          <code className="block break-all rounded-md border border-border p-2 text-sm">
            {invite}
          </code>
          <Button
            onClick={() => {
              if (invite)
                void navigator.clipboard.writeText(invite).then(() => toast.success(t.copied));
            }}
          >
            <Copy className="size-4" aria-hidden="true" />
            {t.copyLink}
          </Button>
        </DialogContent>
      </Dialog>

      {bizEdit && (
        <BusinessEdit
          t={t}
          business={business}
          onClose={async (changed) => {
            setBizEdit(false);
            if (changed) {
              await r.refetch();
              await onChanged();
            }
          }}
        />
      )}
      {expEdit && (
        <ExperienceEdit
          t={t}
          businessId={business.id}
          provinceId={business.province_id}
          experienceId={expEdit}
          onClose={async () => {
            setExpEdit(null);
            await r.refetch();
            await onChanged();
          }}
        />
      )}
    </div>
  );
}

function BusinessEdit({
  t,
  business,
  onClose,
}: {
  t: Txt;
  business: BizRow;
  onClose: (changed: boolean) => void;
}) {
  const [description, setDescription] = useState(business.description ?? "");
  const [address, setAddress] = useState(business.location?.address ?? "");
  const [phone, setPhone] = useState(business.contact?.phone ?? "");
  const [email, setEmail] = useState(business.contact?.email ?? "");
  const [whatsapp, setWhatsapp] = useState(business.contact?.whatsapp ?? "");
  const [images, setImages] = useState(business.images ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const contact = Object.fromEntries(
      Object.entries({ ...(business.contact ?? {}), phone, email, whatsapp }).filter(
        ([, v]) => typeof v === "string" && v.trim() !== "",
      ),
    );
    const { error: e } = await supabase
      .from("businesses")
      .update({
        description: description.trim() || null,
        location: { ...(business.location ?? {}), address: address.trim() },
        contact,
      })
      .eq("id", business.id);
    setBusy(false);
    if (e) {
      setError(t.errGeneric);
      return;
    }
    toast.success(t.saved);
    onClose(true);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose(images !== business.images)}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{business.name}</DialogTitle>
          <DialogDescription>{t.businessLabel}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field id="b-desc" label={t.missing.description}>
            <Textarea
              id="b-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </Field>
          <Field id="b-addr" label={t.missing.address}>
            <Input id="b-addr" value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field id="b-phone" label={t.phone}>
              <Input
                id="b-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
              />
            </Field>
            <Field id="b-email" label="Email">
              <Input
                id="b-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field id="b-wa" label="WhatsApp">
              <Input
                id="b-wa"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                inputMode="tel"
              />
            </Field>
          </div>
          <h4 className="font-medium pt-2">{t.photosTitle}</h4>
          <ContentPhotos
            businessId={business.id}
            table="businesses"
            rowId={business.id}
            images={images}
            onChange={setImages}
          />
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={() => void save()} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t.save}
            </Button>
            <Button variant="outline" onClick={() => onClose(images !== business.images)}>
              {t.cancel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const DAYS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function ExperienceEdit({
  t,
  businessId,
  provinceId,
  experienceId,
  onClose,
}: {
  t: Txt;
  businessId: string;
  provinceId: string | null;
  experienceId: string;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const q = useQuery({
    queryKey: ["admin-content-experience", experienceId],
    queryFn: async () => {
      const [e, a, d] = await Promise.all([
        supabase
          .from("experiences")
          .select(
            "id, title_pt, title_en, description_pt, description_en, price_mzn, capacity, destination_id, images",
          )
          .eq("id", experienceId)
          .single(),
        supabase
          .from("experience_availability")
          .select("id, day_of_week, start_time, end_time, capacity, active, accepts_new_bookings")
          .eq("experience_id", experienceId)
          .order("day_of_week"),
        provinceId
          ? supabase
              .from("destinations")
              .select("id, name")
              .eq("province_id", provinceId)
              .order("name")
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (e.error) throw new Error(e.error.message);
      if (a.error) throw new Error(a.error.message);
      if (d.error) throw new Error(d.error.message);
      return { exp: e.data, slots: a.data ?? [], destinations: d.data ?? [] };
    },
  });

  if (q.isLoading || !q.data)
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.experienceLabel}</DialogTitle>
            <DialogDescription>{q.isError ? t.errLoad : t.loading}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

  return (
    <ExperienceForm
      key={q.data.exp.id}
      t={t}
      lang={lang}
      businessId={businessId}
      data={q.data}
      onClose={onClose}
      reload={() => void q.refetch()}
    />
  );
}

function ExperienceForm({
  t,
  lang,
  businessId,
  data,
  onClose,
  reload,
}: {
  t: Txt;
  lang: "pt" | "en";
  businessId: string;
  data: {
    exp: {
      id: string;
      title_pt: string;
      title_en: string | null;
      description_pt: string | null;
      description_en: string | null;
      price_mzn: number;
      capacity: number | null;
      destination_id: string | null;
      images: string[] | null;
    };
    slots: {
      id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      capacity: number;
    }[];
    destinations: { id: string; name: string }[];
  };
  onClose: () => void;
  reload: () => void;
}) {
  const e = data.exp;
  const [titleEn, setTitleEn] = useState(e.title_en ?? "");
  const [descPt, setDescPt] = useState(e.description_pt ?? "");
  const [descEn, setDescEn] = useState(e.description_en ?? "");
  const [price, setPrice] = useState(String(e.price_mzn ?? ""));
  const [capacity, setCapacity] = useState(String(e.capacity ?? ""));
  const [destination, setDestination] = useState(e.destination_id ?? "");
  const [images, setImages] = useState(e.images ?? []);
  const [slot, setSlot] = useState({
    day: "1",
    start: "09:00",
    end: "11:00",
    cap: String(e.capacity ?? 8),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const days = lang === "pt" ? DAYS_PT : DAYS_EN;

  const save = async () => {
    const p = Number(price.replace(",", "."));
    const c = Number(capacity);
    if (!Number.isFinite(p) || p < 0 || !Number.isInteger(c) || c < 1 || c > 100) {
      setError(`${t.missing.price} / ${t.missing.capacity}`);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from("experiences")
      .update({
        title_en: titleEn.trim() || null,
        description_pt: descPt.trim() || null,
        description_en: descEn.trim() || null,
        price_mzn: p,
        capacity: c,
        destination_id: destination || null,
      })
      .eq("id", e.id);
    setBusy(false);
    if (err) {
      const codes = notReadyCodes(err.message);
      setError(
        codes.length
          ? `${t.notReadyError} ${codes.map((x) => t.missing[x]).join(", ")}`
          : t.errGeneric,
      );
      return;
    }
    toast.success(t.saved);
    onClose();
  };

  const addSlot = async () => {
    const cap = Number(slot.cap);
    if (!(slot.end > slot.start) || !Number.isInteger(cap) || cap < 1 || cap > 100) {
      setError(t.importErrors.times);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("experience_availability").insert({
      experience_id: e.id,
      day_of_week: Number(slot.day),
      start_time: `${slot.start}:00`,
      end_time: `${slot.end}:00`,
      capacity: cap,
      active: true,
      accepts_new_bookings: true,
    });
    setBusy(false);
    if (err) setError(t.errGeneric);
    else reload();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{e.title_pt}</DialogTitle>
          <DialogDescription>{t.experienceLabel}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field id="e-price" label={`${t.missing.price} (MZN)`}>
              <Input
                id="e-price"
                inputMode="decimal"
                value={price}
                onChange={(x) => setPrice(x.target.value)}
              />
            </Field>
            <Field id="e-cap" label={t.missing.capacity}>
              <Input
                id="e-cap"
                inputMode="numeric"
                value={capacity}
                onChange={(x) => setCapacity(x.target.value)}
              />
            </Field>
          </div>
          <Field id="e-title-en" label={t.missing.title_en}>
            <Input id="e-title-en" value={titleEn} onChange={(x) => setTitleEn(x.target.value)} />
          </Field>
          <Field id="e-desc-pt" label={t.missing.description_pt}>
            <Textarea
              id="e-desc-pt"
              rows={3}
              value={descPt}
              onChange={(x) => setDescPt(x.target.value)}
            />
          </Field>
          <Field id="e-desc-en" label={t.missing.description_en}>
            <Textarea
              id="e-desc-en"
              rows={3}
              value={descEn}
              onChange={(x) => setDescEn(x.target.value)}
            />
          </Field>
          <Field id="e-dest" label={t.missing.location}>
            <select
              id="e-dest"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={destination}
              onChange={(x) => setDestination(x.target.value)}
            >
              <option value="">—</option>
              {data.destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <h4 className="font-medium pt-2">{t.missing.schedule}</h4>
          {data.slots.length > 0 && (
            <ul className="text-sm space-y-1">
              {data.slots.map((s) => (
                <li key={s.id}>
                  {days[s.day_of_week]} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} ·{" "}
                  {s.capacity}
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
            <Field id="s-day" label={t.day}>
              <select
                id="s-day"
                className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={slot.day}
                onChange={(x) => setSlot({ ...slot, day: x.target.value })}
              >
                {days.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="s-start" label={t.start}>
              <Input
                id="s-start"
                type="time"
                value={slot.start}
                onChange={(x) => setSlot({ ...slot, start: x.target.value })}
              />
            </Field>
            <Field id="s-end" label={t.end}>
              <Input
                id="s-end"
                type="time"
                value={slot.end}
                onChange={(x) => setSlot({ ...slot, end: x.target.value })}
              />
            </Field>
            <Field id="s-cap" label={t.places}>
              <Input
                id="s-cap"
                inputMode="numeric"
                value={slot.cap}
                onChange={(x) => setSlot({ ...slot, cap: x.target.value })}
              />
            </Field>
            <Button variant="outline" onClick={() => void addSlot()} disabled={busy}>
              <Plus className="size-4" aria-hidden="true" />
              {t.add}
            </Button>
          </div>

          <h4 className="font-medium pt-2">{t.photosTitle}</h4>
          <ContentPhotos
            businessId={businessId}
            table="experiences"
            rowId={e.id}
            images={images}
            onChange={setImages}
          />

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={() => void save()} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t.save}
            </Button>
            <Button variant="outline" onClick={onClose}>
              {t.cancel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
