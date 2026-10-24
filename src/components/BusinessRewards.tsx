import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Pencil, Plus, Ticket } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchOwnerRewards,
  isRewardRedeemable,
  rewardErrorText,
  rewardSchema,
  saveReward,
  setRewardActive,
  validateVoucher,
  type BusinessReward,
  type VoucherCheck,
} from "@/lib/rewards";

const TXT = {
  pt: {
    title: "Recompensas",
    desc: "Recompensas que os turistas podem resgatar com pontos no teu negócio.",
    add: "Nova recompensa",
    edit: "Editar",
    deactivate: "Desativar",
    activate: "Ativar",
    empty: "Ainda não criaste recompensas.",
    loading: "A carregar recompensas…",
    error: "Não foi possível carregar as recompensas.",
    retry: "Tentar novamente",
    notApproved: "Só podes criar recompensas depois de o negócio ser aprovado.",
    active: "Ativa",
    inactive: "Inativa",
    expired: "Expirada",
    soldOut: "Esgotada",
    points: "pontos",
    stock: "Stock",
    unlimited: "ilimitado",
    until: "Válida até",
    formTitleNew: "Nova recompensa",
    formTitleEdit: "Editar recompensa",
    formDesc: "Os pontos são debitados ao turista quando resgata.",
    business: "Negócio",
    titlePt: "Título (PT) *",
    titleEn: "Título (EN)",
    descPt: "Descrição (PT)",
    descEn: "Descrição (EN)",
    cost: "Custo em pontos *",
    stockLabel: "Stock (vazio = ilimitado)",
    validUntil: "Válida até (opcional)",
    activeLabel: "Ativa",
    save: "Guardar",
    saved: "Recompensa guardada.",
    invalid: "Verifica os campos: título PT (mín. 2) e custo inteiro a partir de 1.",
    voucherTitle: "Validar voucher",
    voucherDesc:
      "Escreve o código que o turista te mostra (ex.: EK-…). Cada voucher só é válido uma vez.",
    code: "Código",
    validate: "Validar",
    validated: "Voucher válido — usado agora.",
    alreadyUsed: "Este voucher já tinha sido usado em",
  },
  en: {
    title: "Rewards",
    desc: "Rewards tourists can redeem with points at your business.",
    add: "New reward",
    edit: "Edit",
    deactivate: "Deactivate",
    activate: "Activate",
    empty: "You haven't created any rewards yet.",
    loading: "Loading rewards…",
    error: "Could not load rewards.",
    retry: "Try again",
    notApproved: "You can create rewards once the business is approved.",
    active: "Active",
    inactive: "Inactive",
    expired: "Expired",
    soldOut: "Sold out",
    points: "points",
    stock: "Stock",
    unlimited: "unlimited",
    until: "Valid until",
    formTitleNew: "New reward",
    formTitleEdit: "Edit reward",
    formDesc: "Points are debited from the tourist when they redeem.",
    business: "Business",
    titlePt: "Title (PT) *",
    titleEn: "Title (EN)",
    descPt: "Description (PT)",
    descEn: "Description (EN)",
    cost: "Cost in points *",
    stockLabel: "Stock (empty = unlimited)",
    validUntil: "Valid until (optional)",
    activeLabel: "Active",
    save: "Save",
    saved: "Reward saved.",
    invalid: "Check the fields: PT title (min. 2) and a whole cost from 1.",
    voucherTitle: "Validate voucher",
    voucherDesc: "Type the code the tourist shows you (e.g. EK-…). Each voucher is valid once.",
    code: "Code",
    validate: "Validate",
    validated: "Valid voucher — used now.",
    alreadyUsed: "This voucher was already used on",
  },
} as const;

interface FormState {
  id?: string;
  businessId: string;
  titlePt: string;
  titleEn: string;
  descriptionPt: string;
  descriptionEn: string;
  costPoints: string;
  stock: string;
  validUntil: string;
  active: boolean;
}

const emptyForm = (businessId: string): FormState => ({
  businessId,
  titlePt: "",
  titleEn: "",
  descriptionPt: "",
  descriptionEn: "",
  costPoints: "",
  stock: "",
  validUntil: "",
  active: true,
});

export function BusinessRewards() {
  const { authUser } = useAuth();
  const { lang } = useLang();
  const t = TXT[lang];
  const qc = useQueryClient();
  const uid = authUser?.id ?? null;
  const q = useQuery({
    queryKey: ["owner-rewards", uid],
    queryFn: () => fetchOwnerRewards(uid as string),
    enabled: !!uid,
  });
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [voucher, setVoucher] = useState<VoucherCheck | null>(null);

  const approved = (q.data?.businesses ?? []).filter((b) => b.status === "approved");
  const refresh = () => qc.invalidateQueries({ queryKey: ["owner-rewards", uid] });

  const openEdit = (r: BusinessReward) =>
    setForm({
      id: r.id,
      businessId: r.businessId ?? "",
      titlePt: r.titlePt,
      titleEn: r.titleEn ?? "",
      descriptionPt: r.descriptionPt ?? "",
      descriptionEn: r.descriptionEn ?? "",
      costPoints: String(r.costPoints),
      stock: r.stock === null ? "" : String(r.stock),
      validUntil: r.validUntil ?? "",
      active: r.active,
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const parsed = rewardSchema.safeParse({
      businessId: form.businessId,
      titlePt: form.titlePt,
      titleEn: form.titleEn,
      descriptionPt: form.descriptionPt,
      descriptionEn: form.descriptionEn,
      costPoints: Number(form.costPoints),
      stock: form.stock.trim() === "" ? null : Number(form.stock),
      validUntil: form.validUntil || null,
      active: form.active,
    });
    if (!parsed.success) {
      toast.error(t.invalid);
      return;
    }
    setSaving(true);
    try {
      await saveReward(parsed.data, form.id);
      toast.success(t.saved);
      setForm(null);
      await refresh();
    } catch (err) {
      toast.error(rewardErrorText(err instanceof Error ? err.message : "", lang));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (r: BusinessReward) => {
    setBusy(r.id);
    try {
      await setRewardActive(r.id, !r.active);
      await refresh();
    } catch (err) {
      toast.error(rewardErrorText(err instanceof Error ? err.message : "", lang));
    } finally {
      setBusy(null);
    }
  };

  const check = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    setVoucher(null);
    try {
      setVoucher(await validateVoucher(code));
    } catch (err) {
      toast.error(rewardErrorText(err instanceof Error ? err.message : "", lang));
    } finally {
      setChecking(false);
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString(lang === "pt" ? "pt-PT" : "en-GB", { timeZone: "Africa/Maputo" });

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Gift className="size-5" />
              {t.title}
            </h2>
            <p className="text-sm text-muted-foreground">{t.desc}</p>
          </div>
          <Button
            size="sm"
            disabled={!approved.length}
            onClick={() => setForm(emptyForm(approved[0]?.id ?? ""))}
          >
            <Plus className="size-4" />
            {t.add}
          </Button>
        </div>
        {q.data && !approved.length && (
          <p className="text-sm text-muted-foreground">{t.notApproved}</p>
        )}
        {q.isPending ? (
          <p aria-busy="true" className="text-sm">
            {t.loading}
          </p>
        ) : q.isError ? (
          <div role="alert" className="text-sm">
            <p>{t.error}</p>
            <Button variant="outline" size="sm" onClick={() => void q.refetch()}>
              {t.retry}
            </Button>
          </div>
        ) : !q.data?.rewards.length ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {q.data.rewards.map((r) => {
              const redeemable = isRewardRedeemable(r);
              const state = !r.active
                ? t.inactive
                : r.stock !== null && r.stock <= 0
                  ? t.soldOut
                  : !redeemable
                    ? t.expired
                    : t.active;
              return (
                <li key={r.id} className="p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium break-words">
                      {(lang === "en" && r.titleEn) || r.titlePt}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.costPoints} {t.points} · {t.stock}: {r.stock ?? t.unlimited}
                      {r.validUntil ? ` · ${t.until} ${r.validUntil}` : ""}
                      {r.businessName ? ` · ${r.businessName}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={redeemable ? "default" : "secondary"}>{state}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                      <Pencil className="size-4" />
                      {t.edit}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy === r.id}
                      onClick={() => void toggle(r)}
                    >
                      {r.active ? t.deactivate : t.activate}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form onSubmit={check} className="space-y-2">
        <h3 className="font-semibold flex items-center gap-2">
          <Ticket className="size-4" />
          {t.voucherTitle}
        </h3>
        <p className="text-sm text-muted-foreground">{t.voucherDesc}</p>
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label={t.code}
            placeholder="EK-…"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="max-w-xs uppercase"
          />
          <Button type="submit" disabled={checking || !code.trim()}>
            {t.validate}
          </Button>
        </div>
        {voucher && (
          <p
            role="status"
            className={`text-sm ${voucher.status === "validated" ? "text-primary" : "text-destructive"}`}
          >
            {voucher.status === "validated"
              ? t.validated
              : `${t.alreadyUsed} ${fmtDate(voucher.used_at)}.`}{" "}
            <strong>{lang === "en" ? voucher.title_en : voucher.title_pt}</strong> ·{" "}
            {voucher.cost_points} {t.points}
          </p>
        )}
      </form>

      <Dialog
        open={form !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setForm(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? t.formTitleEdit : t.formTitleNew}</DialogTitle>
            <DialogDescription>{t.formDesc}</DialogDescription>
          </DialogHeader>
          {form && (
            <form onSubmit={submit} className="grid gap-3">
              {!form.id && approved.length > 1 && (
                <div className="grid gap-1">
                  <Label htmlFor="rw-business">{t.business}</Label>
                  <select
                    id="rw-business"
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                    value={form.businessId}
                    onChange={(e) => setForm({ ...form, businessId: e.target.value })}
                  >
                    {approved.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid gap-1">
                <Label htmlFor="rw-tpt">{t.titlePt}</Label>
                <Input
                  id="rw-tpt"
                  value={form.titlePt}
                  onChange={(e) => setForm({ ...form, titlePt: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="rw-ten">{t.titleEn}</Label>
                <Input
                  id="rw-ten"
                  value={form.titleEn}
                  onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="rw-dpt">{t.descPt}</Label>
                <Textarea
                  id="rw-dpt"
                  rows={2}
                  value={form.descriptionPt}
                  onChange={(e) => setForm({ ...form, descriptionPt: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="rw-den">{t.descEn}</Label>
                <Textarea
                  id="rw-den"
                  rows={2}
                  value={form.descriptionEn}
                  onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label htmlFor="rw-cost">{t.cost}</Label>
                  <Input
                    id="rw-cost"
                    type="number"
                    min={1}
                    step={1}
                    value={form.costPoints}
                    onChange={(e) => setForm({ ...form, costPoints: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="rw-stock">{t.stockLabel}</Label>
                  <Input
                    id="rw-stock"
                    type="number"
                    min={0}
                    step={1}
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="rw-until">{t.validUntil}</Label>
                <Input
                  id="rw-until"
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                {t.activeLabel}
              </label>
              <Button type="submit" disabled={saving}>
                {t.save}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
