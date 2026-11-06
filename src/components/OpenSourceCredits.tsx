import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";
import { TILES_PROVIDER } from "@/lib/map-tiles";
import { WEATHER_SOURCE_URL } from "@/lib/weather";

/**
 * Data attributions and open-source licences on /creditos. Loaded on demand by the page; the licence
 * list itself is the static public/licenses.json (scripts/licenses.ts), fetched only when opened.
 * Texts live here so they stay out of the first-load bundle (covered by the parity test).
 */
export const OPEN_SOURCE_TXT = {
  pt: {
    dataTitle: "Mapas e meteorologia",
    osm: "Mapas: dados © contribuidores do OpenStreetMap, disponíveis sob a licença ODbL.",
    esri: "Mapa base e imagens de satélite: Powered by Esri — Fonte: Esri, Maxar, Earthstar Geographics, contribuidores do OpenStreetMap e a comunidade de utilizadores SIG.",
    meteo:
      "Meteorologia: dados da MET Norway (Instituto Meteorológico da Noruega), sob a licença CC BY 4.0.",
    directions:
      "Direções: a aplicação não calcula percursos; abre o Google Maps ou o OpenStreetMap com as paragens do roteiro.",
    linkOsm: "Direitos de autor do OpenStreetMap",
    linkEsri: "Termos da Esri",
    linkMeteo: "MET Norway",
    softwareTitle: "Software de código aberto",
    softwareIntro:
      "O EKAYA é feito com estas bibliotecas de código aberto. A lista mostra o nome, a versão e a licença de cada uma, como estão na versão publicada da aplicação.",
    show: "Mostrar licenças",
    loading: "A carregar…",
    errLoad: "Não foi possível carregar a lista de licenças.",
    retry: "Tentar novamente",
    name: "Biblioteca",
    version: "Versão",
    license: "Licença",
  },
  en: {
    dataTitle: "Maps and weather",
    osm: "Maps: data © OpenStreetMap contributors, available under the ODbL licence.",
    esri: "Basemap and satellite imagery: Powered by Esri — Source: Esri, Maxar, Earthstar Geographics, OpenStreetMap contributors and the GIS User Community.",
    meteo:
      "Weather: data from MET Norway (Norwegian Meteorological Institute), under the CC BY 4.0 licence.",
    directions:
      "Directions: the app does not calculate routes; it opens Google Maps or OpenStreetMap with the itinerary stops.",
    linkOsm: "OpenStreetMap copyright",
    linkEsri: "Esri terms",
    linkMeteo: "MET Norway",
    softwareTitle: "Open-source software",
    softwareIntro:
      "EKAYA is built with these open-source libraries. The list shows the name, version and licence of each one, as in the published version of the app.",
    show: "Show licences",
    loading: "Loading…",
    errLoad: "Could not load the licence list.",
    retry: "Try again",
    name: "Library",
    version: "Version",
    license: "Licence",
  },
} as const;

interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  url: string | null;
}

const linkClass = "inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline";

function Ext({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  );
}

export function OpenSourceCredits() {
  const { lang } = useLang();
  const t = OPEN_SOURCE_TXT[lang];
  const [state, setState] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [list, setList] = useState<LicenseEntry[]>([]);

  const load = async () => {
    setState("loading");
    try {
      const res = await fetch("/licenses.json");
      if (!res.ok) throw new Error(String(res.status));
      setList((await res.json()) as LicenseEntry[]);
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <>
      <section className="space-y-2" aria-labelledby="cr-data">
        <h2 id="cr-data" className="text-xl font-bold">
          {t.dataTitle}
        </h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>
            {t.osm} <Ext href="https://www.openstreetmap.org/copyright">{t.linkOsm}</Ext>
          </li>
          {TILES_PROVIDER === "esri" && (
            <li>
              {t.esri}{" "}
              <Ext href="https://www.esri.com/en-us/legal/terms/full-master-agreement">
                {t.linkEsri}
              </Ext>
            </li>
          )}
          <li>
            {t.meteo} <Ext href={WEATHER_SOURCE_URL}>{t.linkMeteo}</Ext>
          </li>
          <li>{t.directions}</li>
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="cr-software">
        <h2 id="cr-software" className="text-xl font-bold">
          {t.softwareTitle}
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">{t.softwareIntro}</p>
        {state === "idle" && (
          <Button variant="outline" onClick={() => void load()}>
            {t.show}
          </Button>
        )}
        {state === "loading" && (
          <p aria-busy="true" className="inline-flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t.loading}
          </p>
        )}
        {state === "error" && (
          <div role="alert" className="space-y-2 text-sm">
            <p>{t.errLoad}</p>
            <Button variant="outline" onClick={() => void load()}>
              {t.retry}
            </Button>
          </div>
        )}
        {state === "done" && (
          <div className="overflow-x-auto rounded-[10px] border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="p-2 font-semibold">
                    {t.name}
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    {t.version}
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    {t.license}
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.name} className="border-t border-border">
                    <th scope="row" className="p-2 font-medium break-all">
                      {e.url ? (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {e.name}
                        </a>
                      ) : (
                        e.name
                      )}
                    </th>
                    <td className="p-2 font-mono">{e.version}</td>
                    <td className="p-2">{e.license}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
