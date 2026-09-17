import { alpha, createTheme } from "@mui/material/styles";
import { inter } from "./font";

export const brand = {
  50: "hsl(210, 100%, 95%)",
  100: "hsl(210, 100%, 92%)",
  200: "hsl(210, 100%, 80%)",
  300: "hsl(210, 100%, 65%)",
  400: "hsl(210, 98%, 48%)",
  500: "hsl(210, 98%, 42%)",
  600: "hsl(210, 98%, 55%)",
  700: "hsl(210, 100%, 35%)",
  800: "hsl(210, 100%, 16%)",
  900: "hsl(210, 100%, 21%)",
};

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

export const nomaTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      light: brand[200],
      main: brand[400],
      dark: brand[700],
      contrastText: brand[50],
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
    divider: alpha(gray[300], 0.4),
    background: {
      default: "hsl(0, 0%, 99%)",
      paper: "#fff",
    },
    text: {
      primary: gray[800],
      secondary: gray[600],
    },
    action: {
      hover: alpha(gray[200], 0.2),
      selected: alpha(gray[200], 0.3),
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
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, hsl(210, 100%, 90%), transparent)",
          backgroundAttachment: "fixed",
          backgroundRepeat: "no-repeat",
          backgroundColor: "hsl(0, 0%, 99%)",
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
          border: `1px solid ${alpha(gray[200], 0.8)}`,
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
          borderColor: alpha(gray[200], 0.8),
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: "#fff",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: gray[400],
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderWidth: 1,
            borderColor: brand[400],
            boxShadow: `0 0 0 3px ${alpha(brand[400], 0.16)}`,
          },
        },
        notchedOutline: {
          borderColor: alpha(gray[300], 0.8),
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${alpha(gray[200], 0.8)}`,
          backgroundColor: "#fff",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha("#fff", 0.8),
          color: gray[800],
          boxShadow: "none",
          borderBottom: `1px solid ${alpha(gray[200], 0.8)}`,
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
            color: brand[700],
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
          color: gray[600],
          backgroundColor: gray[50],
          borderBottom: `1px solid ${alpha(gray[200], 0.8)}`,
        },
        body: {
          borderBottom: `1px solid ${alpha(gray[200], 0.6)}`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: `1px solid ${alpha(gray[200], 0.8)}`,
          boxShadow:
            "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          border: `1px solid ${alpha(gray[200], 0.8)}`,
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
