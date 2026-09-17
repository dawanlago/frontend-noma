import Box from "@mui/material/Box";
import FormLabel from "@mui/material/FormLabel";
import Typography from "@mui/material/Typography";

interface FormFieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export default function FormField({ label, hint, children }: FormFieldProps) {
  return (
    <Box sx={{ mb: 2 }}>
      <FormLabel sx={{ display: "block", mb: 0.75, fontWeight: 600, color: "text.primary", fontSize: 13 }}>
        {label}
      </FormLabel>
      {children}
      {hint ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}
