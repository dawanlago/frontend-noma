import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";

interface ComingSoonProps {
  title: string;
  description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 4 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "action.hover",
            color: "primary.main",
            mb: 2,
          }}
        >
          <AutoAwesomeOutlined />
        </Box>
        <Typography variant="h6">{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 520 }}>
          {description}
        </Typography>
        <Chip label="Em construção" color="warning" size="small" sx={{ mt: 2 }} />
      </CardContent>
    </Card>
  );
}
