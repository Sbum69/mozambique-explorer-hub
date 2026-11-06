import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";

/**
 * Data attributions and open-source licences on /creditos. Loaded on demand by the page; the licence
 * list itself is the static public/licenses.json (scripts/licenses.ts), fetched only when opened.
 * Texts live here so they stay out of the first-load bundle (covered by the parity test).
 */
export const OPEN_SOURCE_TXT = {
  pt: {
    dataTitle: "Mapas, rotas e meteorologia",
    osm: "Mapas e rotas: dados © contribuidores do OpenStreetMap, disponíveis sob a licença ODbL.",
    esri: "Imagens de satélite: Tiles © Esri — Fonte: Esri, Maxar, Earthstar Geographics e a comunidade de utilizadores SIG.",
    osrm: "Cálculo de rotas: OSRM (Project OSRM), com dados do OpenStreetMap.",
    meteo: "Dados meteorológicos: Open-Meteo.com, sob a licença CC BY 4.0.",
    linkOsm: "Direitos de autor do OpenStreetMap",
    linkEsri: "Termos da Esri",
    linkMeteo: "Open-Meteo",
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
    dataTitle: "Maps, routes and weather",
    osm: "Maps and routes: data © OpenStreetMap contributors, available under the ODbL licence.",
    esri: "Satellite imagery: Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics and the GIS User Community.",
    osrm: "Route calculation: OSRM (Project OSRM), using OpenStreetMap data.",
    meteo: "Weather data: Open-Meteo.com, under the CC BY 4.0 licence.",
    linkOsm: "OpenStreetMap copyright",
    linkEsri: "Esri terms",
    linkMeteo: "Open-Meteo",
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
          <li>
            {t.esri}{" "}
            <Ext href="https://www.esri.com/en-us/legal/terms/full-master-agreement">
              {t.linkEsri}
            </Ext>
          </li>
          <li>{t.osrm}</li>
          <li>
            {t.meteo} <Ext href="https://open-meteo.com/">{t.linkMeteo}</Ext>
          </li>
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
