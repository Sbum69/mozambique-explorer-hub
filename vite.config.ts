// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Server routes (e.g. /lovable/email/*) need non-VITE_ env vars such as
// SUPABASE_SERVICE_ROLE_KEY. Load them into process.env for server-side code
// only — never add these keys to envDefine, or secrets would leak into the
// client bundle.
const serverEnv = loadEnv(
  process.env.NODE_ENV === "production" ? "production" : "development",
  process.cwd(),
  "",
);
Object.assign(process.env, serverEnv);

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        // Pin entities to the hoisted v4.5.0 copy: a nested v7 copy breaks SSR
        // because v7 removed ./lib/decode.js.
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
      },
    },
    environments: {
      client: {
        build: {
          rollupOptions: {
            output: {
              // lucide-react otherwise becomes one tiny chunk per icon (dozens of extra requests on
              // every page, each paying mobile latency): keep the icons together in one file.
              manualChunks(id: string) {
                if (id.includes("node_modules/lucide-react")) return "icons";
              },
            },
          },
        },
      },
    },
  },
});
