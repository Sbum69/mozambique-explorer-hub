import { useState } from "react";
import { MapPin, CheckCircle, Navigation, BookOpen, Waves, Building2, Palmtree } from "lucide-react";
import { getTreasureStops, type TreasureStop } from "@/data/treasure-stops";

const KIND_META: Record<TreasureStop["kind"], { icon: typeof MapPin; label: string }> = {
  story: { icon: BookOpen, label: "Story Stop" },
  point: { icon: Building2, label: "Ponto do bairro" },
  beach: { icon: Waves, label: "Praia" },
  island: { icon: Palmtree, label: "Ilha" },
};

interface Props {
  gameId: string;
  /** ids already validated in previous sessions */
  doneIds: string[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function TreasureStopPicker({ gameId, doneIds, selectedId, onSelect }: Props) {
  const [stops] = useState<TreasureStop[]>(() => getTreasureStops(gameId));

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-xs font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1">
        <MapPin className="size-3.5" /> Seleciona a paragem que fizeste
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        Story Stops, pontos de bairro, praias e ilhas elegíveis para este desafio.
      </p>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {stops.map((s) => {
          const done = doneIds.includes(s.id);
          const active = selectedId === s.id;
          const Meta = KIND_META[s.kind];
          return (
            <button
              key={s.id}
              type="button"
              disabled={done}
              onClick={() => onSelect(active ? null : s.id)}
              className={`w-full text-left rounded-lg border p-3 transition ${
                done
                  ? "opacity-60 bg-green-50 border-green-200 cursor-default"
                  : active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "bg-background hover:bg-muted/60"
              }`}
            >
              <div className="flex items-start gap-2">
                <Meta.icon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {Meta.label} · {s.place}
                  </p>
                  {s.hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{s.hint}</p>}
                </div>
                {done ? (
                  <CheckCircle className="size-4 text-green-600 shrink-0" />
                ) : s.coords ? (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${s.coords[0]},${s.coords[1]}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 text-muted-foreground hover:text-primary"
                    aria-label={`Como chegar a ${s.name}`}
                  >
                    <Navigation className="size-4" />
                  </a>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
