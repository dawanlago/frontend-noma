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
  if (compact) {
    return (
      <Box sx={{ width: "100%", mb: 3, minWidth: 0 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          useFlexGap
          sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {eyebrow ? (
              <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: 1.2, fontWeight: 700 }}>
                {eyebrow}
              </Typography>
            ) : null}
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: "1.6rem", sm: "2.25rem" },
                fontWeight: 600,
                letterSpacing: -0.6,
                lineHeight: 1.15,
                textWrap: "balance",
              }}
            >
              {title}
            </Typography>
            {description ? (
              <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: 15, lineHeight: 1.7, maxWidth: 560 }}>
                {description}
              </Typography>
            ) : null}
          </Box>
          {actions ? (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", flexShrink: 0, pt: { sm: 0.5 } }}>
              {actions}
            </Stack>
          ) : null}
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        mb: 4,
        px: { xs: 1, sm: 2 },
        py: { xs: 3, sm: 6 },
        textAlign: "center",
      }}
    >
      <Stack
        spacing={2}
        sx={{
          alignItems: "center",
          maxWidth: 760,
          mx: "auto",
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
            fontSize: { xs: "2.4rem", sm: "3.5rem" },
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
              fontSize: 16,
              lineHeight: 1.7,
              maxWidth: 560,
            }}
          >
            {description}
          </Typography>
        ) : null}
        {actions ? (
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: "wrap", pt: 0.5, justifyContent: "center" }}>
            {actions}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
