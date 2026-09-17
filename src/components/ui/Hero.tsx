import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface HeroProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}

export default function Hero({ eyebrow, title, description, actions, compact }: HeroProps) {
  return (
    <Box
      sx={{
        width: "100%",
        mb: compact ? 3 : 4,
        px: compact ? { xs: 0, sm: 0 } : { xs: 1, sm: 2 },
        py: compact ? { xs: 1, sm: 2 } : { xs: 3, sm: 6 },
        textAlign: compact ? "left" : "center",
      }}
    >
      <Stack
        spacing={compact ? 1.25 : 2}
        sx={{
          alignItems: compact ? "flex-start" : "center",
          maxWidth: compact ? 720 : 760,
          mx: compact ? 0 : "auto",
        }}
      >
        {eyebrow ? (
          <Typography
            variant="overline"
            sx={{ color: "primary.main", letterSpacing: 1.2, fontWeight: 700 }}
          >
            {eyebrow}
          </Typography>
        ) : null}
        <Typography
          component="h1"
          sx={{
            fontSize: compact
              ? { xs: "1.85rem", sm: "2.25rem" }
              : { xs: "2.4rem", sm: "3.5rem" },
            fontWeight: 600,
            letterSpacing: -0.6,
            lineHeight: 1.15,
            textWrap: "balance",
          }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography
            color="text.secondary"
            sx={{
              fontSize: compact ? 15 : 16,
              lineHeight: 1.7,
              maxWidth: 560,
            }}
          >
            {description}
          </Typography>
        ) : null}
        {actions ? (
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: "wrap", pt: 0.5 }}>
            {actions}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
