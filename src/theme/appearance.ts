/**
 * Aparência do sistema escolhida por cada pessoa (fica salva neste navegador):
 * modo claro/escuro/automático e a cor de destaque.
 */
export type ThemeMode = "light" | "dark" | "system";

export interface AccentPreset {
  key: string;
  label: string;
  /** Canais HSL ("H S% L%") no modo claro e no escuro. */
  light: string;
  dark: string;
}

export const ACCENTS: AccentPreset[] = [
  { key: "blue", label: "Azul", light: "210 98% 48%", dark: "210 95% 62%" },
  { key: "red", label: "Vermelho Noma", light: "350 85% 42%", dark: "350 80% 62%" },
  { key: "green", label: "Verde", light: "152 62% 34%", dark: "152 50% 50%" },
  { key: "purple", label: "Roxo", light: "262 70% 55%", dark: "262 80% 72%" },
  { key: "orange", label: "Laranja", light: "24 92% 48%", dark: "24 92% 60%" },
  { key: "pink", label: "Rosa", light: "330 75% 50%", dark: "330 80% 68%" },
];

export interface Appearance {
  mode: ThemeMode;
  /** Chave de um preset ou "custom". */
  accent: string;
  /** Cor personalizada (#RRGGBB), usada quando accent = "custom". */
  custom?: string;
}

export const CUSTOM_ACCENT = "custom";
const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Aceita "#abc", "abc", "#aabbcc" ou "aabbcc"; devolve "#aabbcc" ou "" se inválido. */
export function normalizeHex(value: string): string {
  let hex = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.replace(/./g, (c) => c + c);
  return /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toLowerCase()}` : "";
}

/** Cor personalizada → canais HSL do tema claro e do escuro (clareia no escuro para manter contraste). */
export function accentFromHex(hex: string): AccentPreset {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = Math.round(h * 60 + 360) % 360;
  }
  const sat = Math.round(s * 100);
  const light = Math.round(l * 100);
  // Botões usam texto branco: no claro, limita a luminosidade; no escuro, garante que apareça no fundo escuro.
  return {
    key: CUSTOM_ACCENT,
    label: "Personalizada",
    light: `${h} ${sat}% ${Math.min(light, 52)}%`,
    dark: `${h} ${sat}% ${Math.min(75, Math.max(light, 60))}%`,
  };
}

export const DEFAULT_APPEARANCE: Appearance = { mode: "light", accent: "blue" };
export const APPEARANCE_KEY = "noma:appearance";

export function accentOf(key: string, custom?: string): AccentPreset {
  if (key === CUSTOM_ACCENT && custom && HEX_RE.test(custom)) return accentFromHex(custom);
  return ACCENTS.find((item) => item.key === key) || ACCENTS[0];
}

export function readAppearance(): Appearance {
  try {
    const saved = JSON.parse(localStorage.getItem(APPEARANCE_KEY) || "{}") as Partial<Appearance>;
    return {
      mode: saved.mode === "dark" || saved.mode === "system" ? saved.mode : "light",
      accent: accentOf(saved.accent || "", saved.custom).key,
      custom: saved.custom && HEX_RE.test(saved.custom) ? saved.custom : undefined,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Aplica no <html>: `data-theme` e as variáveis da cor de destaque. */
export function applyAppearance(appearance: Appearance, forceLight = false) {
  const root = document.documentElement;
  const accent = accentOf(appearance.accent, appearance.custom);
  const mode = forceLight ? "light" : resolveMode(appearance.mode);
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  root.style.setProperty("--accent-light", accent.light);
  root.style.setProperty("--accent-dark", accent.dark);
}

/** HSL com vírgulas ("hsl(210, 98%, 48%)"), o formato que o MUI entende. */
export function hslOf(channels: string, lightness?: number) {
  const [h, s, l] = channels.split(" ");
  return `hsl(${h}, ${s}, ${lightness !== undefined ? `${lightness}%` : l})`;
}

/**
 * Roda no <head> antes da página aparecer, para não piscar o tema claro.
 * Mantém a mesma lógica de `readAppearance` + `applyAppearance`.
 */
export const APPEARANCE_BOOT_SCRIPT = `(function(){try{var a=JSON.parse(localStorage.getItem(${JSON.stringify(APPEARANCE_KEY)})||"{}");var A=${JSON.stringify(
  Object.fromEntries(ACCENTS.map((item) => [item.key, [item.light, item.dark]])),
)};var c=a.accent==="custom"&&a.customLight?[a.customLight,a.customDark]:A[a.accent]||A.blue;var m=a.mode==="dark"||(a.mode==="system"&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";if(/^\\/(f|p|agendar|nps\\/responder)\\//.test(location.pathname))m="light";var r=document.documentElement;r.dataset.theme=m;r.style.colorScheme=m;r.style.setProperty("--accent-light",c[0]);r.style.setProperty("--accent-dark",c[1]);if(localStorage.getItem("noma:hide-values")==="1")r.classList.add("noma-hide-values");}catch(e){}})();`;
