import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Megaphone, Plus, Receipt, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/contexts/LanguageContext";
import { useBusinessCategories, useProvinces } from "@/hooks/useProvinces";
import {
  fetchCurrentConfig,
  fetchFounderTerms,
  formatCents,
  isFounderActive,
} from "@/lib/commission";
import { SPONSORED_TXT } from "@/lib/page-texts";
import {
  CAMPAIGN_TYPES,
  cancelMyPlacement,
  fetchMyPlacements,
  fetchPaymentConfig,
  hasReceipt,
  maputoToday,
  ownerCanCancel,
  formatDay,
  placementEnd,
  placementError,
  requestPlacement,
  type CampaignType,
  type Placement,
  type PlacementDuration,
  type PlacementKind,
  type PlacementScope,
} from "@/lib/sponsored";

type Txt = (typeof SPONSORED_TXT)["pt"] | (typeof SPONSORED_TXT)["en"];

const errText = (t: Txt, e: unknown) =>
  t[`err_${placementError(e instanceof Error ? e.message : "")}` as keyof Txt] as string;

/** Business panel → Highlights and campaigns: request, pay by M-Pesa, follow the status. */
export function SponsoredSection({
  businessId,
  approved,
  activities,
}: {
  businessId: string;
  approved: boolean;
  activities: { id: string; title: string }[];
}) {
  const { lang } = useLang();
  const t = SPONSORED_TXT[lang];
  const queryClient = useQueryClient();
  const [askConfirm, confirmDialog] = useConfirm();
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["my-placements", businessId],
    queryFn: async () => {
      const [placements, payment, config, terms] = await Promise.all([
        fetchMyPlacements(businessId),
        fetchPaymentConfig(),
        fetchCurrentConfig(),
        fetchFounderTerms(businessId),
      ]);
      return { placements, payment, config, terms };
    },
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["my-placements", businessId] });

  const cancel = async (p: Placement) => {
    const answer = await askConfirm({
      title: t.cancelTitle,
      description: t.cancelBody,
      confirmLabel: t.cancelRequest,
      destructive: true,
      reason: "required",
      reasonLabel: t.cancelReason,
    });
    if (!answer) return;
    try {
      await cancelMyPlacement(p.id, answer.reason);
      toast.success(t.cancelled);
      await refresh();
    } catch (e) {
      toast.error(errText(t, e));
    }
  };

  return (
    <Card id="business-sponsored" className="p-5 space-y-4 scroll-mt-24">
      {confirmDialog}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Megaphone className="size-5 text-primary" aria-hidden="true" />
          {t.sectionTitle}
        </h2>
        {approved && q.data && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            {t.newRequest}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t.sectionIntro}</p>
      {!approved && (
        <p role="status" className="text-sm">
          {t.notApproved}
        </p>
      )}

      {q.isLoading ? (
        <p aria-busy="true">{t.loading}</p>
      ) : q.isError || !q.data ? (
        <div role="alert" className="space-y-2">
          <p>{t.errLoad}</p>
          <Button variant="outline" size="sm" onClick={() => void q.refetch()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {t.retry}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold">{t.listTitle}</h3>
          {!q.data.placements.length && <p className="text-sm text-muted-foreground">{t.empty}</p>}
          <ul className="space-y-3">
            {q.data.placements.map((p) => (
              <li key={p.id} className="rounded-[10px] border border-border p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium break-words">
                    {p.kind === "campaign"
                      ? `${t[`campaign_${p.campaignType ?? "experience"}`]}: ${(lang === "pt" ? p.titlePt : p.titleEn) ?? ""}`
                      : t.kindHighlight}
                  </p>
                  <Badge variant={p.status === "active" ? "default" : "secondary"}>
                    {t[`status_${p.status}`]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t[`scope_${p.scope}`]} ·{" "}
                  {t.period(formatDay(p.startsOn, lang), formatDay(p.endsOn, lang))} ·{" "}
                  {p.free ? t.priceFree : formatCents(p.priceCents, lang)}
                </p>
                <p className="text-sm">
                  {t.reference}: <span className="font-mono">{p.reference}</span>
                </p>
                {p.decisionReason && <p className="text-sm">{t.reason(p.decisionReason)}</p>}
                {p.status === "awaiting_payment" && (
                  <div className="rounded-md border border-primary/60 p-3 text-sm space-y-1">
                    <p className="font-semibold">{t.payTitle}</p>
                    {q.data.payment ? (
                      <>
                        <p>{t.payAmount(formatCents(p.priceCents, lang))}</p>
                        <p>{t.payNumber(q.data.payment.mpesaNumber, q.data.payment.accountName)}</p>
                        <p>{t.payRef(p.reference)}</p>
                        <p className="whitespace-pre-line text-muted-foreground">
                          {lang === "pt"
                            ? q.data.payment.instructionsPt
                            : q.data.payment.instructionsEn}
                        </p>
                      </>
                    ) : (
                      <p>{t.payMissing}</p>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {hasReceipt(p) && (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/recibo/$id" params={{ id: p.id }}>
                        <Receipt className="size-4" aria-hidden="true" />
                        {t.receipt}
                      </Link>
                    </Button>
                  )}
                  {ownerCanCancel(p.status) && (
                    <Button variant="outline" size="sm" onClick={() => void cancel(p)}>
                      {t.cancelRequest}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {q.data && (
        <RequestDialog
          open={open}
          onOpenChange={setOpen}
          businessId={businessId}
          activities={activities}
          weekCents={q.data.config.highlightWeekCents}
          monthCents={q.data.config.highlightMonthCents}
          freeLeft={
            isFounderActive(q.data.terms)
              ? Math.max(
                  0,
                  q.data.config.founderFreeHighlights -
                    (q.data.terms?.freeHighlightsUsed ?? 0) -
                    q.data.placements.filter(
                      (p) =>
                        p.free && (p.status === "requested" || p.status === "awaiting_payment"),
                    ).length,
                )
              : 0
          }
          onSent={() => void refresh()}
        />
      )}
    </Card>
  );
}

function RequestDialog({
  open,
  onOpenChange,
  businessId,
  activities,
  weekCents,
  monthCents,
  freeLeft,
  onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  businessId: string;
  activities: { id: string; title: string }[];
  weekCents: number;
  monthCents: number;
  freeLeft: number;
  onSent: () => void;
}) {
  const { lang } = useLang();
  const t = SPONSORED_TXT[lang];
  const { provinces } = useProvinces();
  const { categories } = useBusinessCategories();
  const today = maputoToday();
  const [kind, setKind] = useState<PlacementKind>("highlight");
  const [campaignType, setCampaignType] = useState<CampaignType>("dish");
  const [scope, setScope] = useState<PlacementScope>("home");
  const [provinceId, setProvinceId] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [duration, setDuration] = useState<PlacementDuration>("week");
  const [startsOn, setStartsOn] = useState(today);
  const [experienceId, setExperienceId] = useState("");
  const [titlePt, setTitlePt] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [bodyPt, setBodyPt] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = duration === "week" ? weekCents : monthCents;
  const submit = async () => {
    setError(null);
    if ((scope === "province" && !provinceId) || (scope === "category" && !categoryCode))
      return setError(t.errTarget);
    if (kind === "campaign" && (titlePt.trim().length < 2 || titleEn.trim().length < 2))
      return setError(t.errCampaignTitle);
    setBusy(true);
    try {
      const p = await requestPlacement({
        businessId,
        kind,
        campaignType: kind === "campaign" ? campaignType : null,
        scope,
        provinceId: provinceId || null,
        categoryCode: categoryCode || null,
        duration,
        startsOn,
        experienceId: experienceId || null,
        titlePt,
        titleEn,
        bodyPt,
        bodyEn,
      });
      toast.success(t.sent(p.reference));
      onOpenChange(false);
      onSent();
    } catch (e) {
      setError(errText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const select = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>{t.newRequest}</DialogTitle>
        <DialogDescription>{t.priceNote}</DialogDescription>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="sp-kind">{t.kind}</Label>
              <select
                id="sp-kind"
                className={select}
                value={kind}
                onChange={(e) => setKind(e.target.value as PlacementKind)}
              >
                <option value="highlight">{t.kindHighlight}</option>
                <option value="campaign">{t.kindCampaign}</option>
              </select>
            </div>
            {kind === "campaign" && (
              <div className="space-y-1">
                <Label htmlFor="sp-campaign">{t.campaignType}</Label>
                <select
                  id="sp-campaign"
                  className={select}
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value as CampaignType)}
                >
                  {CAMPAIGN_TYPES.map((c) => (
                    <option key={c} value={c}>
                      {t[`campaign_${c}`]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="sp-scope">{t.scope}</Label>
              <select
                id="sp-scope"
                className={select}
                value={scope}
                onChange={(e) => setScope(e.target.value as PlacementScope)}
              >
                <option value="home">{t.scope_home}</option>
                <option value="province">{t.scope_province}</option>
                <option value="category">{t.scope_category}</option>
              </select>
            </div>
            {scope === "province" && (
              <div className="space-y-1">
                <Label htmlFor="sp-province">{t.scope_province}</Label>
                <select
                  id="sp-province"
                  className={select}
                  value={provinceId}
                  onChange={(e) => setProvinceId(e.target.value)}
                >
                  <option value="">{t.choose}</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name[lang]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {scope === "category" && (
              <div className="space-y-1">
                <Label htmlFor="sp-category">{t.scope_category}</Label>
                <select
                  id="sp-category"
                  className={select}
                  value={categoryCode}
                  onChange={(e) => setCategoryCode(e.target.value)}
                >
                  <option value="">{t.choose}</option>
                  {categories.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name[lang]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="sp-duration">{t.duration}</Label>
              <select
                id="sp-duration"
                className={select}
                value={duration}
                onChange={(e) => setDuration(e.target.value as PlacementDuration)}
              >
                <option value="week">{t.duration_week}</option>
                <option value="month">{t.duration_month}</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sp-start">{t.startsOn}</Label>
              <Input
                id="sp-start"
                type="date"
                min={today}
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value || today)}
                aria-describedby="sp-end"
              />
              <p id="sp-end" className="text-xs text-muted-foreground">
                {t.endsOn(formatDay(placementEnd(startsOn, duration), lang))}
              </p>
            </div>
            {activities.length > 0 && (
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="sp-activity">{t.activity}</Label>
                <select
                  id="sp-activity"
                  className={select}
                  value={experienceId}
                  onChange={(e) => setExperienceId(e.target.value)}
                >
                  <option value="">{t.none}</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {kind === "campaign" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="sp-tpt">{t.titlePt}</Label>
                <Input
                  id="sp-tpt"
                  maxLength={80}
                  value={titlePt}
                  onChange={(e) => setTitlePt(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sp-ten">{t.titleEn}</Label>
                <Input
                  id="sp-ten"
                  maxLength={80}
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sp-bpt">{t.bodyPt}</Label>
                <Textarea
                  id="sp-bpt"
                  maxLength={280}
                  value={bodyPt}
                  onChange={(e) => setBodyPt(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sp-ben">{t.bodyEn}</Label>
                <Textarea
                  id="sp-ben"
                  maxLength={280}
                  value={bodyEn}
                  onChange={(e) => setBodyEn(e.target.value)}
                />
              </div>
            </div>
          )}
          <p className="font-semibold">
            {t.price}: {freeLeft > 0 ? t.priceFree : formatCents(price, lang)}
          </p>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {busy ? t.sending : t.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
