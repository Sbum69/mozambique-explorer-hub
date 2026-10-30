import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/contexts/LanguageContext";
import type { Province } from "@/lib/provinces";
import type { Destination } from "@/lib/destinations";
import type { Experience } from "@/lib/experiences";
import type { ItineraryRoute } from "@/lib/routes";
import {
  createCommunityPost,
  postInputMissing,
  updateCommunityPost,
  type CommunityCategory,
  type CommunityPost,
} from "@/lib/community";

/** Create/edit form of the community feed, loaded when the editor opens. */
export function PostEditor({
  post,
  categories,
  provinces,
  destinations,
  experiences,
  routes,
  onClose,
  onSaved,
}: {
  post: CommunityPost | null;
  categories: CommunityCategory[];
  provinces: Province[];
  destinations: Destination[];
  experiences: Experience[];
  routes: ItineraryRoute[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang } = useLang();
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [categoryId, setCategoryId] = useState(post?.categoryId ?? "");
  const [provinceId, setProvinceId] = useState(post?.provinceId ?? "");
  const [destinationId, setDestinationId] = useState(post?.destinationId ?? "");
  const [experienceId, setExperienceId] = useState(post?.experienceId ?? "");
  const [routeId, setRouteId] = useState(post?.routeId ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (postInputMissing({ title, content, categoryId, provinceId })) {
      toast.error(t("communityRequiredFields"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title,
        content,
        categoryId,
        provinceId,
        destinationId: destinationId || null,
        experienceId: experienceId || null,
        routeId: routeId || null,
      };
      if (post) {
        await updateCommunityPost(post.id, payload);
        toast.success(t("communityPostUpdated"));
      } else {
        await createCommunityPost(payload);
        toast.success(t("communityPostCreated"));
      }
      onSaved();
    } catch {
      toast.error(lang === "pt" ? "Não foi possível guardar." : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-[10px] shadow-[var(--shadow-overlay)] w-full max-w-lg overflow-hidden my-8"
      >
        <div className="border-b border-border p-5 flex items-center justify-between">
          <h3 className="font-bold">{post ? t("communityEditPost") : t("communityNewPost")}</h3>
          <button
            onClick={onClose}
            className="size-8 rounded-md hover:bg-accent flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <Field label={`${t("communityPostTitle")} *`}>
            <Input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 160))} />
          </Field>
          <Field label={`${t("communityPostContent")} *`}>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 4000))}
              className="h-32"
            />
          </Field>
          <Field label={`${t("categoryField")} *`}>
            <Select value={categoryId} onChange={setCategoryId} placeholder="—">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name[lang]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`${t("communityProvince")} *`}>
            <Select value={provinceId} onChange={setProvinceId} placeholder="—">
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name[lang]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("communityDestination")}>
            <Select value={destinationId} onChange={setDestinationId} placeholder="—">
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("communityExperience")}>
            <Select value={experienceId} onChange={setExperienceId} placeholder="—">
              {experiences.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title[lang]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("communityRoute")}>
            <Select value={routeId} onChange={setRouteId} placeholder="—">
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-xs text-muted-foreground">{t("communityImageSoon")}</p>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={saving} className="">
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Send className="mr-2 size-4" />
            )}
            {post ? t("communitySave") : t("communityPublish")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}
