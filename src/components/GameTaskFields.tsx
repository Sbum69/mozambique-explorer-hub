import { useMemo, useState } from "react";
import { Heart, Route as RouteIcon, Sunrise, Sunset, CalendarDays, Share2, Check, Languages, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EXPERIENCES } from "@/data/experiences";
import { SAMPLE_ITINERARIES, getUserItineraries, type Itinerary } from "@/data/itineraries";

function Wrap({ title, hint, icon: Icon, children }: { title: string; hint?: string; icon: typeof Heart; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-xs font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1">
        <Icon className="size-3.5" /> {title}
      </p>
      {hint && <p className="text-xs text-muted-foreground mb-3">{hint}</p>}
      {children}
    </div>
  );
}

/* ---------------- Experiência comunitária ---------------- */
export function ExperienceTask({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null, label?: string) => void;
}) {
  return (
    <Wrap title="Escolhe a experiência" hint="Seleciona a experiência comunitária em que participaste." icon={Heart}>
      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
        {EXPERIENCES.map((e) => {
          const active = value === e.id;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onChange(active ? null : e.id, e.title.pt)}
              className={`w-full text-left rounded-lg border p-3 transition ${
                active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "bg-background hover:bg-muted/60"
              }`}
            >
              <p className="text-sm font-semibold truncate">{e.title.pt}</p>
              <p className="text-xs text-muted-foreground truncate">
                {e.location} · {e.durationHours}h · {e.priceMzn} MZN · {e.host}
              </p>
            </button>
          );
        })}
      </div>
    </Wrap>
  );
}

/* ---------------- Roteiro + paragem ---------------- */
export function ItineraryTask({
  value,
  onChange,
}: {
  value: { itineraryId: string; stopId: number } | null;
  onChange: (v: { itineraryId: string; stopId: number } | null, label?: string) => void;
}) {
  const list = useMemo<Itinerary[]>(() => [...SAMPLE_ITINERARIES, ...getUserItineraries()], []);
  const [openId, setOpenId] = useState<string | null>(value?.itineraryId ?? null);
  const current = list.find((i) => i.id === openId);

  return (
    <Wrap title="Roteiro concluído" hint="Escolhe o roteiro e a paragem que finalizaste." icon={RouteIcon}>
      <div className="space-y-2">
        <select
          value={openId ?? ""}
          onChange={(e) => {
            setOpenId(e.target.value || null);
            onChange(null);
          }}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
        >
          <option value="">Seleciona um roteiro…</option>
          {list.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.duration})
            </option>
          ))}
        </select>

        {current && (
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {current.route.map((s) => {
              const active = value?.itineraryId === current.id && value?.stopId === s.id;
              const name = s.name ?? s.title ?? `Paragem ${s.id}`;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    onChange(active ? null : { itineraryId: current.id, stopId: s.id }, `${current.name} · ${name}`)
                  }
                  className={`w-full text-left rounded-lg border p-2.5 transition ${
                    active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "bg-background hover:bg-muted/60"
                  }`}
                >
                  <p className="text-sm font-medium truncate">
                    {s.id}. {name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{s.location ?? s.category ?? s.type}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Wrap>
  );
}

/* ---------------- Momento do dia ---------------- */
export function TimeOfDayTask({
  value,
  onChange,
}: {
  value: { moment: "sunrise" | "sunset"; time: string } | null;
  onChange: (v: { moment: "sunrise" | "sunset"; time: string } | null, label?: string) => void;
}) {
  const [moment, setMoment] = useState<"sunrise" | "sunset">(value?.moment ?? "sunrise");
  const [time, setTime] = useState(value?.time ?? "");

  const valid = (m: "sunrise" | "sunset", t: string) => {
    const h = Number(t.split(":")[0]);
    if (Number.isNaN(h)) return false;
    return m === "sunrise" ? h >= 4 && h <= 9 : h >= 16 && h <= 21;
  };

  const update = (m: "sunrise" | "sunset", t: string) => {
    setMoment(m);
    setTime(t);
    if (valid(m, t)) onChange({ moment: m, time: t }, `${m === "sunrise" ? "Amanhecer" : "Pôr-do-sol"} ${t}`);
    else onChange(null);
  };

  const invalid = time !== "" && !valid(moment, time);

  return (
    <Wrap title="Momento do dia" hint="Regista a hora real da captura (amanhecer 04:00–09:59, pôr-do-sol 16:00–21:59)." icon={moment === "sunrise" ? Sunrise : Sunset}>
      <div className="flex gap-2 mb-2">
        {(["sunrise", "sunset"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => update(m, time)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              moment === m ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/60"
            }`}
          >
            {m === "sunrise" ? "🌅 Amanhecer" : "🌇 Pôr-do-sol"}
          </button>
        ))}
      </div>
      <input
        type="time"
        value={time}
        onChange={(e) => update(moment, e.target.value)}
        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
      />
      {invalid && <p className="text-xs text-destructive mt-1">Hora fora da janela deste momento.</p>}
    </Wrap>
  );
}

/* ---------------- Evento cultural ---------------- */
export function EventTask({
  value,
  onChange,
}: {
  value: { name: string; date: string } | null;
  onChange: (v: { name: string; date: string } | null, label?: string) => void;
}) {
  const [name, setName] = useState(value?.name ?? "");
  const [date, setDate] = useState(value?.date ?? "");

  const withinWeek = (d: string) => {
    if (!d) return false;
    const diff = Date.now() - new Date(d).getTime();
    return diff >= -86400000 && diff <= 7 * 86400000;
  };

  const update = (n: string, d: string) => {
    setName(n);
    setDate(d);
    if (n.trim().length >= 3 && withinWeek(d)) onChange({ name: n.trim(), date: d }, `${n.trim()} (${d})`);
    else onChange(null);
  };

  return (
    <Wrap title="Evento cultural" hint="Nome do evento e data (deve ser nos últimos 7 dias)." icon={CalendarDays}>
      <input
        value={name}
        onChange={(e) => update(e.target.value, date)}
        placeholder="ex: Festival de Marrabenta"
        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => update(name, e.target.value)}
        className="w-full mt-2 px-3 py-2 rounded-lg border bg-background text-sm"
      />
      {date !== "" && !withinWeek(date) && (
        <p className="text-xs text-destructive mt-1">A data tem de estar dentro dos últimos 7 dias.</p>
      )}
    </Wrap>
  );
}

/* ---------------- Partilha ---------------- */
export function ShareTask({
  title,
  text,
  done,
  onDone,
}: {
  title: string;
  text: string;
  done: boolean;
  onDone: () => void;
}) {
  const url = typeof window !== "undefined" ? window.location.origin : "https://ekaya.app";

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title, text, url });
      else await navigator.clipboard.writeText(`${text} ${url}`);
      onDone();
    } catch {
      /* utilizador cancelou */
    }
  };

  return (
    <Wrap title="Prova de partilha" hint="Partilha com alguém para validar este desafio." icon={Share2}>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={done ? "outline" : "default"} onClick={share} className="col-span-2">
          {done ? <Check className="size-4" /> : <Share2 className="size-4" />} {done ? "Partilha registada" : "Partilhar agora"}
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noreferrer"
          onClick={onDone}
          className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted/60"
        >
          <ExternalLink className="size-3.5" /> WhatsApp
        </a>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(`${text} ${url}`);
            onDone();
          }}
          className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted/60"
        >
          <Check className="size-3.5" /> Copiar link
        </button>
      </div>
    </Wrap>
  );
}

/* ---------------- Palavra + significado ---------------- */
export function WordTask({
  value,
  onChange,
}: {
  value: { word: string; meaning: string } | null;
  onChange: (v: { word: string; meaning: string } | null, label?: string) => void;
}) {
  const [word, setWord] = useState(value?.word ?? "");
  const [meaning, setMeaning] = useState(value?.meaning ?? "");

  const update = (w: string, m: string) => {
    setWord(w);
    setMeaning(m);
    if (w.trim().length >= 2 && m.trim().length >= 2) onChange({ word: w.trim(), meaning: m.trim() }, `${w.trim()} = ${m.trim()}`);
    else onChange(null);
  };

  return (
    <Wrap title="Palavra aprendida" hint="Escreve a palavra em língua local e o seu significado." icon={Languages}>
      <input
        value={word}
        onChange={(e) => update(e.target.value, meaning)}
        placeholder="ex: Kanimambo"
        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
      />
      <input
        value={meaning}
        onChange={(e) => update(word, e.target.value)}
        placeholder="ex: Obrigado"
        className="w-full mt-2 px-3 py-2 rounded-lg border bg-background text-sm"
      />
    </Wrap>
  );
}
