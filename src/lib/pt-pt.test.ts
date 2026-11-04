import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { ptPtViolations } from "./assistant/llm-guard";

/**
 * PT-PT / PT-MZ guard: Brazilian Portuguese words ("você", "contato", "ônibus", "celular", "tela",
 * "equipe", "usuário", "cadastro", "baixar") must not come back in the app or the public docs.
 * Files that list those words on purpose are left out.
 */
const ROOT = join(__dirname, "../..");
const ALLOWED = new Set([
  "src/lib/assistant/llm-guard.ts",
  "src/lib/assistant/engine.ts",
  "src/lib/assistant/assistant.test.ts",
  "src/lib/pt-pt.test.ts",
  "src/integrations/supabase/types.ts",
]);

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p, ext);
    return ext.test(name) ? [p] : [];
  });
}

describe("PT-PT/PT-MZ guard", () => {
  const targets = [
    ...files(join(ROOT, "src"), /\.(ts|tsx)$/),
    ...files(join(ROOT, "docs/sales"), /\.md$/),
    ...files(join(ROOT, "docs/content"), /\.md$/),
    join(ROOT, "docs/LAUNCH.md"),
    join(ROOT, "docs/ia/faq-v1.json"),
  ].filter((f) => !ALLOWED.has(relative(ROOT, f).replace(/\\/g, "/")));

  it.each(targets.map((f) => [relative(ROOT, f).replace(/\\/g, "/"), f]))(
    "%s has no Brazilian Portuguese",
    (_name, file) => {
      expect(ptPtViolations(readFileSync(file, "utf8"))).toEqual([]);
    },
  );
});
