import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "gold" | "burgundy" | "sage";
  icon?: ReactNode;
}

const chipColor = {
  default: "primary",
  gold: "warning",
  burgundy: "error",
  sage: "success",
} as const;

export default function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: MetricCardProps) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
          {icon ? (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "action.hover",
                color: `${chipColor[tone]}.main`,
              }}
            >
              {icon}
            </Box>
          ) : null}
        </Stack>
        <Typography variant="h4" sx={{ mt: 2, letterSpacing: -0.4 }}>
          {value}
        </Typography>
        {hint ? (
          <Chip
            size="small"
            color={chipColor[tone]}
            variant="outlined"
            label={hint}
            sx={{ mt: 1.5 }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
