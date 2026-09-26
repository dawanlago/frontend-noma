import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { makeNomaTheme } from "@/theme";
import {
  accentOf,
  APPEARANCE_KEY,
  applyAppearance,
  DEFAULT_APPEARANCE,
  readAppearance,
  resolveMode,
  type Appearance,
} from "@/theme/appearance";

interface AppearanceValue {
  appearance: Appearance;
  /** Modo efetivo (o "automático" já resolvido). */
  mode: "light" | "dark";
  setAppearance: (next: Partial<Appearance>) => void;
}

const AppearanceContext = createContext<AppearanceValue | undefined>(undefined);

/** Tema claro/escuro e cor de destaque: aplica no CSS (variáveis) e no MUI. */
export function AppearanceProvider({ children, forceLight = false }: { children: ReactNode; forceLight?: boolean }) {
  const [appearance, setState] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    setState(readAppearance());
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(query.matches);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const mode = forceLight ? "light" : appearance.mode === "system" ? (systemDark ? "dark" : "light") : resolveMode(appearance.mode);

  useEffect(() => {
    applyAppearance(appearance, forceLight);
  }, [appearance, forceLight, systemDark]);

  const setAppearance = useCallback((next: Partial<Appearance>) => {
    setState((current) => {
      const merged = { ...current, ...next };
      try {
        // Guarda também os canais da cor personalizada, para o script do <head> aplicar antes de carregar.
        const accent = accentOf(merged.accent, merged.custom);
        localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ ...merged, customLight: accent.light, customDark: accent.dark }));
      } catch {
        // Sem armazenamento local: vale só até recarregar.
      }
      return merged;
    });
  }, []);

  const accent = accentOf(appearance.accent, appearance.custom);
  const channels = mode === "dark" ? accent.dark : accent.light;
  const theme = useMemo(() => makeNomaTheme(mode, channels), [mode, channels]);
  const value = useMemo(() => ({ appearance, mode, setAppearance }), [appearance, mode, setAppearance]);

  return (
    <AppearanceContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance must be used within AppearanceProvider");
  return context;
}
