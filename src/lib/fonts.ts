/**
 * Map a theme font name to a CSS font-family stack. "Geist" uses the app's
 * loaded sans font; others fall back gracefully until loaded by the theme.
 */
export function fontFamilyStack(name?: string): string {
  const map: Record<string, string> = {
    Geist: "var(--font-sans)",
    Inter: "Inter, ui-sans-serif, system-ui, sans-serif",
    Roboto: "Roboto, ui-sans-serif, system-ui, sans-serif",
    Lora: "Lora, Georgia, serif",
    "Playfair Display": "'Playfair Display', Georgia, serif",
    "system-ui": "ui-sans-serif, system-ui, sans-serif",
  };
  return (name && map[name]) || "var(--font-sans)";
}

/** Curated fonts offered in the theme editor. */
export const THEME_FONTS = [
  "Geist",
  "Inter",
  "Roboto",
  "Lora",
  "Playfair Display",
  "system-ui",
] as const;

/** Google Fonts stylesheet URL for a theme font (null for built-in fonts). */
export function googleFontHref(name?: string): string | null {
  const specs: Record<string, string> = {
    Inter: "Inter:wght@400;500;600;700",
    Roboto: "Roboto:wght@400;500;700",
    Lora: "Lora:wght@400;500;600;700",
    "Playfair Display": "Playfair+Display:wght@400;500;600;700",
  };
  const spec = name ? specs[name] : undefined;
  return spec
    ? `https://fonts.googleapis.com/css2?family=${spec}&display=swap`
    : null;
}
