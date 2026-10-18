import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, Edit, Plus, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { invalidateExperiencesCatalogue } from "@/hooks/useExperiences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/contexts/LanguageContext";
import { getBusinessManagement, saveBusinessProfile, saveBusinessActivity, saveBusinessAvailability } from "@/lib/business-management.functions";
import { activityCategories, profileSchema, activitySchema, availabilitySchema, managementError, type ActivityInput, type AvailabilityInput } from "@/lib/business-management";

type Management = Awaited<ReturnType<typeof getBusinessManagement>>;
type Business = Management["businesses"][number];
type Activity = Management["activities"][number];
type Slot = Management["availability"][number];
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium min-w-0">{label}{children}</label>;
}
function Options({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: { value: string; label: string }[] }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue placeholder={label} /></SelectTrigger><SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>;
}
const obj = (value: unknown, key: string) => value && typeof value === "object" && key in value ? String((value as Record<string, unknown>)[key] ?? "") : "";
const statusText = (status: string, pt: boolean) => ({ approved: pt ? "Aprovado" : "Approved", pending: pt ? "Pendente" : "Pending", rejected: pt ? "Rejeitado" : "Rejected", suspended: pt ? "Suspenso" : "Suspended" })[status] ?? status;

export function BusinessManagement() {
  const { lang } = useLang(); const pt = lang === "pt";
  const fetchData = useServerFn(getBusinessManagement);
  const [data, setData] = useState<Management | null>(null);
  const [error, setError] = useState(false); const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [editor, setEditor] = useState<Activity | "new" | null>(null);
  const [schedule, setSchedule] = useState<Activity | null>(null);
  const [profile, setProfile] = useState(false);
  const saved = () => { invalidateExperiencesCatalogue(); toast.success(pt ? "Alterações guardadas." : "Changes saved."); };
  const load = useCallback(async () => { setLoading(true); setError(false); try { setData(await fetchData()); } catch { setError(true); } finally { setLoading(false); } }, [fetchData]);
  useEffect(() => { void load(); }, [load]);
  const business = data?.businesses.find(b => b.id === selected) ?? data?.businesses[0];
  if (loading && !data) return <p aria-busy="true">{pt ? "A carregar o negócio…" : "Loading business…"}</p>;
  if (error) return <div role="alert" className="space-y-3"><p>{pt ? "Não foi possível carregar o negócio." : "Could not load your business."}</p><Button onClick={() => void load()}><RefreshCw />{pt ? "Tentar novamente" : "Retry"}</Button></div>;
  if (!data || !business) return <p className="text-muted-foreground">{pt ? "Não existe um negócio associado à tua conta." : "No business is associated with your account."}</p>;
  const activities = data.activities.filter(a => a.business_id === business.id);
  return <div className="space-y-8">
    {data.businesses.length > 1 && <Options label={pt ? "Negócio" : "Business"} value={business.id} onChange={setSelected} options={data.businesses.map(b => ({ value: b.id, label: b.name }))} />}
    <section className="space-y-4 border-b pb-6">
      <div className="flex justify-between items-start gap-3 flex-wrap"><div><h1 className="text-2xl font-bold break-words">{business.name}</h1><Badge variant="secondary" className="mt-2">{statusText(business.status, pt)}</Badge></div><Button variant="outline" onClick={() => setProfile(true)}><Edit className="size-4" />{pt ? "Editar perfil" : "Edit profile"}</Button></div>
      {business.status !== "approved" && <p role="status" className="text-sm text-muted-foreground">{pt ? "O perfil e as atividades podem ser guardados, mas só ficam públicos após aprovação do negócio." : "Profile and activities can be saved, but are only public after business approval."}</p>}
      {business.rejection_reason && <p role="alert" className="text-destructive">{pt ? "Motivo: " : "Reason: "}{business.rejection_reason}</p>}
      <p className="whitespace-pre-line text-muted-foreground">{business.description}</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"><span>{business.category}</span><span>{business.province}</span><span>{obj(business.location, "address")}</span><span>{obj(business.contact, "phone")}</span><span>{obj(business.contact, "email")}</span></div>
    </section>
    <section className="space-y-4"><div className="flex justify-between gap-3 flex-wrap items-center"><h2 className="text-xl font-bold">{pt ? "As Minhas Atividades" : "My Activities"}</h2><Button onClick={() => setEditor("new")}><Plus className="size-4" />{pt ? "Criar atividade" : "Create activity"}</Button></div>
      {!activities.length && <p className="text-muted-foreground py-6">{pt ? "Ainda não tens atividades." : "You have no activities yet."}</p>}
      <ul className="grid gap-3">{activities.map(a => <li key={a.id} className="border rounded-lg p-4 flex gap-4 flex-wrap items-center">
        {a.images?.[0] && <img src={a.images[0]} alt="" className="size-16 rounded-md object-cover" />}
        <div className="flex-1 min-w-0"><h3 className="font-semibold break-words">{lang === "pt" ? a.title_pt : a.title_en ?? a.title_pt}</h3><p className="text-sm text-muted-foreground">{Number(a.price_mzn).toLocaleString(lang)} MZN · {a.duration_hours}h · {a.capacity} {pt ? "pessoas" : "people"}</p><p className="text-xs mt-1">{a.active ? (pt ? "Ativa" : "Active") : (pt ? "Desativada" : "Inactive")} · {a.active && business.status === "approved" ? (pt ? "Pública" : "Public") : (pt ? "Não pública" : "Not public")}</p></div>
        <Button variant="outline" size="sm" onClick={() => setEditor(a)}><Edit className="size-4" />{pt ? "Editar" : "Edit"}</Button><Button variant="outline" size="sm" onClick={() => setSchedule(a)}><Calendar className="size-4" />{pt ? "Disponibilidade" : "Availability"}</Button>
      </li>)}</ul>
    </section>
    <Dialog open={profile} onOpenChange={setProfile}><DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto"><DialogTitle>{pt ? "Editar perfil" : "Edit profile"}</DialogTitle><DialogDescription>{pt ? "A decisão administrativa permanece inalterada." : "The administrative decision remains unchanged."}</DialogDescription><ProfileForm business={business} data={data} onSaved={async () => { await load(); saved(); setProfile(false); }} /></DialogContent></Dialog>
    <Dialog open={editor !== null} onOpenChange={open => { if (!open) setEditor(null); }}><DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto"><DialogTitle>{editor === "new" ? (pt ? "Criar atividade" : "Create activity") : (pt ? "Editar atividade" : "Edit activity")}</DialogTitle><DialogDescription>{pt ? "Atividade comercial · preço por pessoa em MZN" : "Commercial activity · price per person in MZN"}</DialogDescription>{editor && <ActivityForm activity={editor === "new" ? null : editor} business={business} data={data} onSaved={async () => { await load(); saved(); setEditor(null); }} />}</DialogContent></Dialog>
    <Dialog open={schedule !== null} onOpenChange={open => { if (!open) setSchedule(null); }}><DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto"><DialogTitle>{pt ? "Disponibilidade" : "Availability"}</DialogTitle><DialogDescription>{pt ? "Horários semanais recorrentes. Reservas existentes são preservadas." : "Recurring weekly schedules. Existing bookings are preserved."}</DialogDescription>{schedule && <AvailabilityForm activity={schedule} slots={data.availability.filter(s => s.experience_id === schedule.id)} reload={load} />}</DialogContent></Dialog>
  </div>;
}

function ProfileForm({ business, data, onSaved }: { business: Business; data: Management; onSaved: () => Promise<void> }) {
  const { lang } = useLang(); const pt = lang === "pt"; const save = useServerFn(saveBusinessProfile);
  const [form, setForm] = useState({ id: business.id, name: business.name, description: business.description ?? "", categoryCode: business.category_code ?? "", provinceId: business.province_id ?? "", address: obj(business.location, "address"), phone: obj(business.contact, "phone"), email: obj(business.contact, "email"), website: obj(business.contact, "website") });
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const field = (key: "name" | "address" | "phone" | "email" | "website", label: string, type = "text") => <Field label={label}><Input aria-label={label} type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></Field>;
  return <form className="grid sm:grid-cols-2 gap-4" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(""); try { await save({ data: profileSchema.parse(form) }); await onSaved(); } catch (err) { setError(managementError(err, pt)); } finally { setBusy(false); } }}>
    {field("name", pt ? "Nome" : "Name")}
    <Field label={pt ? "Categoria" : "Category"}><Options label={pt ? "Categoria" : "Category"} value={form.categoryCode} onChange={categoryCode => setForm({ ...form, categoryCode })} options={data.categories.filter(c => c.active || c.code === business.category_code).map(c => ({ value: c.code, label: pt ? c.name_pt : c.name_en }))} /></Field>
    <Field label={pt ? "Província" : "Province"}><Options label={pt ? "Província" : "Province"} value={form.provinceId} onChange={provinceId => setForm({ ...form, provinceId })} options={data.provinces.filter(p => p.active || p.id === business.province_id).map(p => ({ value: p.id, label: pt ? p.name_pt : p.name_en }))} /></Field>
    {field("address", pt ? "Endereço" : "Address")}{field("phone", pt ? "Telefone" : "Phone")}{field("email", "Email", "email")}{field("website", "Website", "url")}
    <div className="sm:col-span-2"><Field label={pt ? "Descrição" : "Description"}><Textarea aria-label={pt ? "Descrição" : "Description"} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field></div>
    <Submit busy={busy} error={error} pt={pt} />
  </form>;
}
function ActivityForm({ activity, business, data, onSaved }: { activity: Activity | null; business: Business; data: Management; onSaved: () => Promise<void> }) {
  const { lang } = useLang(); const pt = lang === "pt"; const save = useServerFn(saveBusinessActivity);
  const [form, setForm] = useState<ActivityInput>({ id: activity?.id, businessId: business.id, titlePt: activity?.title_pt ?? "", titleEn: activity?.title_en ?? "", descriptionPt: activity?.description_pt ?? "", descriptionEn: activity?.description_en ?? "", category: activityCategories.find(c => c === activity?.category) ?? "culture", priceMzn: Number(activity?.price_mzn ?? NaN), durationHours: Number(activity?.duration_hours ?? NaN), capacity: activity?.capacity ?? NaN, location: activity?.location ?? "", destinationId: activity?.destination_id ?? null, active: activity?.active ?? false });
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const number = (key: "priceMzn" | "durationHours" | "capacity", label: string) => <Field label={label}><Input aria-label={label} type="number" min={key === "priceMzn" ? 0 : key === "capacity" ? 1 : 0.01} step={key === "capacity" ? 1 : 0.01} required value={Number.isNaN(form[key]) ? "" : form[key]} onChange={e => setForm({ ...form, [key]: e.target.value === "" ? NaN : Number(e.target.value) })} /></Field>;
  const categories = { beach: ["Praia", "Beach"], culture: ["Cultura", "Culture"], food: ["Gastronomia", "Food"], nature: ["Natureza", "Nature"], community: ["Comunidade", "Community"], adventure: ["Aventura", "Adventure"] };
  return <form className="grid sm:grid-cols-2 gap-4" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(""); try { await save({ data: activitySchema.parse(form) }); await onSaved(); } catch (err) { setError(managementError(err, pt)); } finally { setBusy(false); } }}>
    {(["titlePt", "titleEn"] as const).map((key, i) => <Field key={key} label={`${pt ? "Título" : "Title"} ${i ? "EN" : "PT"}`}><Input required aria-label={`${pt ? "Título" : "Title"} ${i ? "EN" : "PT"}`} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></Field>)}
    {(["descriptionPt", "descriptionEn"] as const).map((key, i) => <Field key={key} label={`${pt ? "Descrição" : "Description"} ${i ? "EN" : "PT"}`}><Textarea required aria-label={`${pt ? "Descrição" : "Description"} ${i ? "EN" : "PT"}`} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></Field>)}
    <Field label={pt ? "Categoria" : "Category"}><Options label={pt ? "Categoria da atividade" : "Activity category"} value={form.category} onChange={category => setForm({ ...form, category: activityCategories.find(c => c === category) ?? "culture" })} options={activityCategories.map(c => ({ value: c, label: categories[c][pt ? 0 : 1] }))} /></Field>
    {number("priceMzn", pt ? "Preço por pessoa (MZN)" : "Price per person (MZN)")}{number("durationHours", pt ? "Duração (horas)" : "Duration (hours)")}{number("capacity", pt ? "Capacidade" : "Capacity")}
    <Field label={pt ? "Localização" : "Location"}><Input required aria-label={pt ? "Localização" : "Location"} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></Field>
    <Field label={pt ? "Destino (opcional)" : "Destination (optional)"}><Options label={pt ? "Destino" : "Destination"} value={form.destinationId ?? "none"} onChange={v => setForm({ ...form, destinationId: v === "none" ? null : v })} options={[{ value: "none", label: pt ? "Sem destino associado" : "No linked destination" }, ...data.destinations.filter(d => d.province_id === business.province_id).map(d => ({ value: d.id, label: d.name }))]} /></Field>
    <Field label={pt ? "Ativa" : "Active"}><Switch aria-label={pt ? "Ativa" : "Active"} checked={form.active} onCheckedChange={active => setForm({ ...form, active })} /></Field>
    <p className="text-xs text-muted-foreground">{pt ? "Novas reservas exigem negócio aprovado, atividade ativa e horário disponível." : "New bookings require an approved business, an active activity and available schedule."}</p>
    <Submit busy={busy} error={error} pt={pt} />
  </form>;
}
function AvailabilityForm({ activity, slots, reload }: { activity: Activity; slots: Slot[]; reload: () => Promise<void> }) {
  const { lang } = useLang(); const pt = lang === "pt"; const save = useServerFn(saveBusinessAvailability);
  const blank: AvailabilityInput = { experienceId: activity.id, dayOfWeek: 1, startTime: "", endTime: "", capacity: NaN, active: true };
  const [form, setForm] = useState(blank); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState(false);
  const days = pt ? ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"] : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return <div className="space-y-5"><ul className="space-y-2">{slots.map(s => <li className="border-b pb-2 flex items-center gap-2 flex-wrap" key={s.id}><span className="text-sm flex-1">{days[s.day_of_week]} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · {s.capacity} · {s.active ? (pt ? "Ativo" : "Active") : (pt ? "Inativo" : "Inactive")}</span><Button variant="ghost" size="sm" onClick={() => { setSuccess(false); setError(""); setForm({ id: s.id, experienceId: activity.id, dayOfWeek: s.day_of_week, startTime: s.start_time.slice(0, 5), endTime: s.end_time.slice(0, 5), capacity: s.capacity, active: s.active }); }}><Edit className="size-4" />{pt ? "Editar horário" : "Edit schedule"}</Button></li>)}</ul>
    {!slots.length && <p className="text-sm text-muted-foreground">{pt ? "Sem horários. Não é possível reservar esta atividade." : "No schedules. This activity cannot be booked."}</p>}
    <Button size="sm" variant="outline" onClick={() => { setForm(blank); setSuccess(false); setError(""); }}><Plus className="size-4" />{pt ? "Novo horário" : "New schedule"}</Button>
    <form className="grid sm:grid-cols-2 gap-4" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(""); setSuccess(false); try { await save({ data: availabilitySchema.parse(form) }); await reload(); setForm(blank); setSuccess(true); } catch (err) { setError(managementError(err, pt)); } finally { setBusy(false); } }}>
      <Field label={pt ? "Dia da semana" : "Weekday"}><Options label={pt ? "Dia da semana" : "Weekday"} value={String(form.dayOfWeek)} onChange={v => setForm({ ...form, dayOfWeek: Number(v) })} options={days.map((label, i) => ({ value: String(i), label }))} /></Field>
      <Field label={pt ? "Lugares por horário" : "Seats per schedule"}><Input type="number" required min={1} max={100} aria-label={pt ? "Lugares por horário" : "Seats per schedule"} value={Number.isNaN(form.capacity) ? "" : form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} /></Field>
      <Field label={pt ? "Hora inicial" : "Start time"}><Input type="time" required aria-label={pt ? "Hora inicial" : "Start time"} value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} /></Field><Field label={pt ? "Hora final" : "End time"}><Input required type="time" aria-label={pt ? "Hora final" : "End time"} value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} /></Field>
      <Field label={pt ? "Horário ativo" : "Schedule active"}><Switch aria-label={pt ? "Horário ativo" : "Schedule active"} checked={form.active} onCheckedChange={active => setForm({ ...form, active })} /></Field><Submit busy={busy} error={error} pt={pt} />
      {success && <p role="status">{pt ? "Horário guardado." : "Schedule saved."}</p>}
    </form>
  </div>;
}
function Submit({ busy, error, pt }: { busy: boolean; error: string; pt: boolean }) {
  return <div className="sm:col-span-2 space-y-2">{error && <p role="alert" className="text-destructive text-sm">{error}</p>}<Button type="submit" disabled={busy}><Save className="size-4" />{busy ? (pt ? "A guardar…" : "Saving…") : (pt ? "Guardar" : "Save")}</Button></div>;
}