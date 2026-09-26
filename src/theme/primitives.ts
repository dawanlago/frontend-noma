import { alpha, createTheme } from "@mui/material/styles";
import { inter } from "./font";

/** Escala da cor de destaque a partir dos canais HSL ("210 98% 48%"). */
export function brandScale(channels: string) {
  const [h, sat] = channels.split(" ");
  const tone = (l: number, s = sat) => `hsl(${h}, ${s}, ${l}%)`;
  const main = `hsl(${channels.split(" ").join(", ")})`;
  return {
    50: tone(95, "100%"),
    100: tone(92, "100%"),
    200: tone(80, "100%"),
    300: tone(65, "100%"),
    400: main,
    500: tone(42),
    600: tone(55),
    700: tone(35, "100%"),
    800: tone(16, "100%"),
    900: tone(21, "100%"),
  };
}

export const brand = brandScale("210 98% 48%");

export const gray = {
  50: "hsl(220, 35%, 97%)",
  100: "hsl(220, 30%, 94%)",
  200: "hsl(220, 20%, 88%)",
  300: "hsl(220, 20%, 80%)",
  400: "hsl(220, 20%, 65%)",
  500: "hsl(220, 20%, 42%)",
  600: "hsl(220, 20%, 35%)",
  700: "hsl(220, 20%, 25%)",
  800: "hsl(220, 30%, 6%)",
  900: "hsl(220, 35%, 3%)",
};

export const green = {
  400: "hsl(120, 44%, 53%)",
  500: "hsl(120, 59%, 30%)",
};

export const orange = {
  400: "hsl(45, 90%, 40%)",
  500: "hsl(45, 90%, 35%)",
};

export const red = {
  400: "hsl(0, 90%, 40%)",
  500: "hsl(0, 90%, 30%)",
};

const base = createTheme();

/** Cores do tema escuro (as mesmas do globals.css). */
const dark = {
  canvas: "hsl(222, 22%, 7%)",
  paper: "hsl(222, 18%, 11%)",
  muted: "hsl(222, 16%, 15%)",
  line: "hsl(222, 12%, 26%)",
  text: "hsl(220, 20%, 92%)",
  textSoft: "hsl(220, 12%, 68%)",
};

export function makeNomaTheme(mode: "light" | "dark" = "light", accent = "210 98% 48%") {
  const brand = brandScale(accent);
  const isDark = mode === "dark";
  const paper = isDark ? dark.paper : "#fff";
  const line = isDark ? alpha(dark.line, 0.9) : alpha(gray[200], 0.8);
  return createTheme({
    // Mesma curva do CSS (--ease-out): menus, colapsos e modais saem rápido e pousam suave.
    transitions: {
      easing: {
        easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
        easeInOut: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
    palette: {
      mode,
      primary: {
        light: brand[200],
        main: brand[400],
        dark: brand[700],
        contrastText: isDark ? "#fff" : brand[50],
      },
      info: {
        light: brand[100],
        main: brand[300],
        dark: brand[600],
        contrastText: gray[50],
      },
      warning: {
        light: "hsl(45, 90%, 65%)",
        main: orange[400],
        dark: "hsl(45, 94%, 20%)",
      },
      error: {
        light: "hsl(0, 90%, 65%)",
        main: red[400],
        dark: "hsl(0, 94%, 18%)",
      },
      success: {
        light: "hsl(120, 61%, 77%)",
        main: green[400],
        dark: "hsl(120, 75%, 16%)",
      },
      grey: gray,
      divider: isDark ? alpha(dark.line, 0.7) : alpha(gray[300], 0.4),
      background: {
        default: isDark ? dark.canvas : "hsl(0, 0%, 99%)",
        paper,
      },
      text: {
        primary: isDark ? dark.text : gray[800],
        secondary: isDark ? dark.textSoft : gray[600],
      },
      action: {
        hover: isDark ? alpha(dark.line, 0.35) : alpha(gray[200], 0.2),
        selected: isDark ? alpha(dark.line, 0.5) : alpha(gray[200], 0.3),
      },
    },
    typography: {
      fontFamily: inter.style.fontFamily,
      h1: { fontSize: base.typography.pxToRem(48), fontWeight: 600, lineHeight: 1.2, letterSpacing: -0.5 },
      h2: { fontSize: base.typography.pxToRem(36), fontWeight: 600, lineHeight: 1.2 },
      h3: { fontSize: base.typography.pxToRem(30), fontWeight: 600, lineHeight: 1.2 },
      h4: { fontSize: base.typography.pxToRem(24), fontWeight: 600, lineHeight: 1.5 },
      h5: { fontSize: base.typography.pxToRem(20), fontWeight: 600 },
      h6: { fontSize: base.typography.pxToRem(18), fontWeight: 600 },
      subtitle1: { fontSize: base.typography.pxToRem(18) },
      subtitle2: { fontSize: base.typography.pxToRem(14), fontWeight: 500 },
      body1: { fontSize: base.typography.pxToRem(14) },
      body2: { fontSize: base.typography.pxToRem(14), fontWeight: 400 },
      caption: { fontSize: base.typography.pxToRem(12), fontWeight: 400 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    shadows: [
      "none",
      "hsla(220, 30%, 5%, 0.07) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.07) 0px 8px 16px -5px",
      ...base.shadows.slice(2),
    ] as typeof base.shadows,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            fontFamily: inter.style.fontFamily,
          },
          "body, #__next": {
            fontFamily: inter.style.fontFamily,
          },
          "button, input, textarea, select": {
            fontFamily: "inherit",
          },
          body: {
            backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, ${alpha(brand[400], isDark ? 0.14 : 0.14)}, transparent)`,
            backgroundAttachment: "fixed",
            backgroundRepeat: "no-repeat",
            backgroundColor: isDark ? dark.canvas : "hsl(0, 0%, 99%)",
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: "none",
            fontWeight: 600,
          },
          contained: {
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
          },
          sizeLarge: {
            padding: "10px 18px",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${line}`,
            boxShadow: "none",
            backgroundImage: "none",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
          outlined: {
            borderColor: line,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: paper,
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: isDark ? dark.textSoft : gray[400],
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderWidth: 1,
              borderColor: brand[400],
              boxShadow: `0 0 0 3px ${alpha(brand[400], 0.16)}`,
            },
          },
          notchedOutline: {
            borderColor: isDark ? dark.line : alpha(gray[300], 0.8),
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${line}`,
            backgroundColor: paper,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(paper, 0.8),
            color: isDark ? dark.text : gray[800],
            boxShadow: "none",
            borderBottom: `1px solid ${line}`,
            backdropFilter: "blur(8px)",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            "&.Mui-selected": {
              backgroundColor: alpha(brand[400], 0.12),
              color: isDark ? brand[300] : brand[700],
              "&:hover": { backgroundColor: alpha(brand[400], 0.16) },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            color: isDark ? dark.textSoft : gray[600],
            backgroundColor: isDark ? dark.muted : gray[50],
            borderBottom: `1px solid ${line}`,
          },
          body: {
            borderBottom: `1px solid ${line}`,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            border: `1px solid ${line}`,
            boxShadow:
              "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 10,
            border: `1px solid ${line}`,
            boxShadow:
              "hsla(220, 30%, 5%, 0.07) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.07) 0px 8px 16px -5px",
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: 3, borderRadius: 3 },
        },
      },
    },
  });
}

export const nomaTheme = makeNomaTheme();
