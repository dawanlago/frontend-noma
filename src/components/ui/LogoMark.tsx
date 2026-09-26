import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useAppearance } from "@/contexts/AppearanceContext";

interface LogoMarkProps {
  size?: "sm" | "md" | "lg";
  /** Mostra "Produtora" abaixo da logo. */
  withWordmark?: boolean;
  /** Versão branca, para fundos escuros. */
  inverted?: boolean;
}

/** Altura da logo (a largura acompanha a proporção do arquivo). */
const heights = {
  sm: 22,
  md: 30,
  lg: 42,
};

export const LOGO_RED = "/brand/noma-vermelho.png";
export const LOGO_WHITE = "/brand/noma-branco.png";
/** Versão clara usada no tema escuro. */
export const LOGO_DARK_THEME = "/brand/noma-claro.png";

export default function LogoMark({ size = "sm", withWordmark = false, inverted = false }: LogoMarkProps) {
  const { mode } = useAppearance();
  return (
    <Box sx={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={inverted ? LOGO_WHITE : mode === "dark" ? LOGO_DARK_THEME : LOGO_RED} alt="Noma" style={{ height: heights[size], width: "auto", display: "block" }} />
      {withWordmark ? (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            letterSpacing: 1.4,
            textTransform: "uppercase",
            fontSize: size === "lg" ? 12 : 10.5,
            color: inverted ? "rgba(255,255,255,0.62)" : "text.secondary",
          }}
        >
          Produtora
        </Typography>
      ) : null}
    </Box>
  );
}
