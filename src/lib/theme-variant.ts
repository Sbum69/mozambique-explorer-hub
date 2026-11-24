/**
 * Look of the app (tokens only, docs/design/README.md):
 *   - "default": "Capulana e Índico" (src/styles.css);
 *   - "a": "Terra e Índico", warmer and more cultural (src/themes/variant-a.css);
 *   - "b": "Limpo", cleaner and more modern (src/themes/variant-b.css).
 * Each variant has light and dark tokens, with AA contrast checked by theme-variants.test.ts.
 */
export type ThemeVariant = "default" | "a" | "b";

/** THE line to change to make a variant the default look of the app. */
export const DEFAULT_THEME_VARIANT: ThemeVariant = "default";

/**
 * Variant in use: VITE_THEME_VARIANT=a|b|default when building or running locally (to compare),
 * otherwise DEFAULT_THEME_VARIANT. Any other value falls back to the default.
 */
export function themeVariant(
  fromEnv: string | undefined = import.meta.env.VITE_THEME_VARIANT,
): ThemeVariant {
  return fromEnv === "a" || fromEnv === "b" || fromEnv === "default"
    ? fromEnv
    : DEFAULT_THEME_VARIANT;
}

/** Value of <html data-variant>: absent for the default look. */
export function variantAttribute(v: ThemeVariant = themeVariant()): "a" | "b" | undefined {
  return v === "default" ? undefined : v;
}
