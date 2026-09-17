import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface LogoMarkProps {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  inverted?: boolean;
}

const markSizes = {
  sm: 32,
  md: 40,
  lg: 56,
};

export default function LogoMark({
  size = "sm",
  withWordmark = false,
  inverted = false,
}: LogoMarkProps) {
  const dimension = markSizes[size];

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <Box
        sx={{
          width: dimension,
          height: dimension,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: inverted ? "common.white" : "primary.main",
          color: inverted ? "primary.main" : "primary.contrastText",
          fontWeight: 800,
          fontSize: size === "lg" ? 22 : size === "md" ? 18 : 15,
          letterSpacing: -0.6,
        }}
      >
        N
      </Box>
      {withWordmark ? (
        <Box sx={{ lineHeight: 1 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: size === "lg" ? 22 : 18,
              letterSpacing: -0.4,
              color: inverted ? "common.white" : "text.primary",
            }}
          >
            Noma
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 0.25,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: inverted ? "rgba(255,255,255,0.62)" : "text.secondary",
            }}
          >
            CRM
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
