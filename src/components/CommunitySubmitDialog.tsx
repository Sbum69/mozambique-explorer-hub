import { useEffect, useState } from "react";
import { Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLang } from "@/contexts/LanguageContext";
import { useProvinces } from "@/hooks/useProvinces";
import {
  COMMUNITY_CATEGORIES,
  fetchCommunityExperiences,
  submitCommunityExperience,
  uploadCommunityPhoto,
  type CommunityCategory,
  type CommunityExperience,
  type CommunityInput,
} from "@/lib/community-experiences";

const EMPTY: CommunityInput = {
  titlePt: "", titleEn: "", descriptionPt: "", descriptionEn: "", provinceId: "",
  category: "beach", location: "", lat: null, lng: null, imageUrl: null, imagePath: null, additionalInfo: "",
};

/** Proposal form for signed-in tourists/businesses. The database forces status = pending. */
export function CommunitySubmitDialog({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string }) {
  const { lang } = useLang();
  const pt = lang === "pt";
  const { provinces } = useProvinces();
  const [form, setForm] = useState<CommunityInput>(EMPTY);
  const [latText, setLatText] = useState("");
  const [lngText, setLngText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mine, setMine] = useState<CommunityExperience[]>([]);

  const loadMine = () => fetchCommunityExperiences({ mine: userId }).then(setMine).catch(() => setMine([]));
  useEffect(() => { if (open) void loadMine(); }, [open, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof CommunityInput>(k: K, v: CommunityInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      set("imagePath", await uploadCommunityPhoto(userId, file));
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      toast.error(m === "too_large" ? (pt ? "Máximo 5 MB." : "Max 5 MB.") : m === "invalid_type" ? (pt ? "Escolhe uma imagem." : "Choose an image.") : (pt ? "Não foi possível carregar a fotografia." : "Couldn't upload the photo."));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    const lat = latText.trim() === "" ? null : Number(latText.replace(",", "."));
    const lng = lngText.trim() === "" ? null : Number(lngText.replace(",", "."));
    if (!form.titlePt.trim() || !form.titleEn.trim() || !form.descriptionPt.trim() || !form.descriptionEn.trim() || !form.provinceId || !form.location.trim()) {
      toast.error(pt ? "Preenche títulos, descrições (PT/EN), província e localização." : "Fill in titles, descriptions (PT/EN), province and location.");
      return;
    }
    if ((lat === null) !== (lng === null) || (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) || (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180))) {
      toast.error(pt ? "Coordenadas inválidas (indica latitude e longitude, ou deixa ambas vazias)." : "Invalid coordinates (fill both latitude and longitude, or leave both empty).");
      return;
    }
    setSaving(true);
    try {
      await submitCommunityExperience(userId, { ...form, lat, lng });
      toast.success(pt ? "Proposta enviada! Fica pendente até aprovação do Admin." : "Proposal sent! It stays pending until an admin approves it.");
      setForm(EMPTY); setLatText(""); setLngText("");
      void loadMine();
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      toast.error(m.includes("duplicate") ? (pt ? "Já existe uma atividade com este título nesta província." : "An activity with this title already exists in this province.") : (pt ? "Não foi possível enviar a proposta." : "Couldn't send the proposal."));
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (s: string) =>
    s === "pending" ? <Badge variant="secondary">{pt ? "Pendente" : "Pending"}</Badge>
      : s === "rejected" ? <Badge variant="destructive">{pt ? "Rejeitada" : "Rejected"}</Badge>
        : <Badge>{pt ? "Aprovada" : "Approved"}</Badge>;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pt ? "Propor uma Experiência Comunitária" : "Propose a Community Experience"}</DialogTitle>
          <DialogDescription>
            {pt ? "Atividade gratuita, sem reserva nem preço. Será revista pelo Admin antes de ficar pública." : "Free activity, no booking or price. An admin reviews it before it goes public."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input aria-label={pt ? "Título PT" : "Title PT"} placeholder={pt ? "Título (PT)" : "Title (PT)"} value={form.titlePt} onChange={(e) => set("titlePt", e.target.value)} maxLength={140} />
          <Input aria-label={pt ? "Título EN" : "Title EN"} placeholder={pt ? "Título (EN)" : "Title (EN)"} value={form.titleEn} onChange={(e) => set("titleEn", e.target.value)} maxLength={140} />
          <Textarea aria-label={pt ? "Descrição PT" : "Description PT"} placeholder={pt ? "Descrição (PT)" : "Description (PT)"} value={form.descriptionPt} onChange={(e) => set("descriptionPt", e.target.value)} maxLength={2000} />
          <Textarea aria-label={pt ? "Descrição EN" : "Description EN"} placeholder={pt ? "Descrição (EN)" : "Description (EN)"} value={form.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} maxLength={2000} />
          <select aria-label={pt ? "Província" : "Province"} className="h-9 rounded-md border bg-background px-3 text-sm" value={form.provinceId} onChange={(e) => set("provinceId", e.target.value)}>
            <option value="">{pt ? "Província..." : "Province..."}</option>
            {provinces.map((p) => <option key={p.id} value={p.id}>{p.name[lang]}</option>)}
          </select>
          <select aria-label={pt ? "Categoria" : "Category"} className="h-9 rounded-md border bg-background px-3 text-sm" value={form.category} onChange={(e) => set("category", e.target.value as CommunityCategory)}>
            {COMMUNITY_CATEGORIES.filter((c) => c.id !== "all").map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label[lang]}</option>)}
          </select>
          <Input aria-label={pt ? "Localização" : "Location"} placeholder={pt ? "Localização" : "Location"} value={form.location} onChange={(e) => set("location", e.target.value)} maxLength={200} className="sm:col-span-2" />
          <Input aria-label="Latitude" placeholder="Latitude (ex. -25.96)" inputMode="decimal" value={latText} onChange={(e) => setLatText(e.target.value)} />
          <Input aria-label="Longitude" placeholder="Longitude (ex. 32.57)" inputMode="decimal" value={lngText} onChange={(e) => setLngText(e.target.value)} />
          <Textarea aria-label={pt ? "Informação adicional" : "Additional information"} placeholder={pt ? "Informação adicional (opcional)" : "Additional information (optional)"} value={form.additionalInfo ?? ""} onChange={(e) => set("additionalInfo", e.target.value)} maxLength={1000} className="sm:col-span-2" />
          <label className="sm:col-span-2 flex items-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm cursor-pointer hover:bg-muted/50">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4 text-primary" />}
            {uploading ? (pt ? "A carregar..." : "Uploading...") : form.imagePath ? (pt ? "Fotografia anexada ✓ (clica para trocar)" : "Photo attached ✓ (click to replace)") : (pt ? "Anexar fotografia real (máx. 5 MB)" : "Attach a real photo (max 5 MB)")}
            <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => void onPhoto(e.target.files?.[0])} />
          </label>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void submit()} disabled={saving || uploading}>
            {saving && <Loader2 className="size-4 animate-spin" />}{pt ? "Enviar proposta" : "Send proposal"}
          </Button>
        </div>
        {mine.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-semibold">{pt ? "As minhas propostas" : "My proposals"}</p>
            {mine.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{m.title[lang]}</p>
                  {m.status === "rejected" && m.rejectionReason && <p className="text-xs text-muted-foreground">{pt ? "Motivo" : "Reason"}: {m.rejectionReason}</p>}
                </div>
                {statusBadge(m.status)}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
