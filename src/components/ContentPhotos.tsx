import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { photoProblem, removeContentPhoto, uploadContentPhoto } from "@/lib/content";
import { CONTENT_TXT } from "@/lib/page-texts";

/**
 * Photos of a business or an activity (public bucket content-photos, folder = business id).
 * Saves the list on the row itself; RLS decides who may (admin, or the owner).
 */
export function ContentPhotos({
  businessId,
  table,
  rowId,
  images,
  onChange,
}: {
  businessId: string;
  table: "experiences" | "businesses";
  rowId: string;
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const { lang } = useLang();
  const t = CONTENT_TXT[lang];
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (next: string[]) => {
    const { error: e } =
      table === "experiences"
        ? await supabase.from("experiences").update({ images: next }).eq("id", rowId)
        : await supabase.from("businesses").update({ images: next }).eq("id", rowId);
    if (e) throw new Error(e.message);
    onChange(next);
  };

  const add = async (file: File) => {
    const problem = photoProblem(file);
    if (problem) {
      setError(problem === "type" ? t.errType : t.errSize);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const url = await uploadContentPhoto(businessId, file);
      await save([...images, url]);
      toast.success(t.saved);
    } catch {
      setError(t.errGeneric);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (url: string) => {
    setBusy(true);
    setError(null);
    try {
      // Update the row first: an active activity cannot lose its last photo (database rule).
      await save(images.filter((x) => x !== url));
      await removeContentPhoto(url).catch(() => undefined);
    } catch {
      setError(t.errGeneric);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.photosHint}</p>
      {images.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((url, i) => (
            <li key={url} className="space-y-1">
              <img
                src={url}
                alt={t.photoAlt(i + 1)}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-md border border-border object-cover"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void remove(url)}
                disabled={busy}
                className="w-full"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {t.removePhoto}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        id={`photo-${rowId}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void add(file);
        }}
      />
      <Button variant="outline" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <ImagePlus className="size-4" aria-hidden="true" />
        )}
        {t.addPhoto}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
