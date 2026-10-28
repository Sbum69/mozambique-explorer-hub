// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
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
