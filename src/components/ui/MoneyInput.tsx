import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { maskCurrencyBRL } from "@/utils/format";

interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function MoneyInput({
  value,
  onChange,
  placeholder = "0,00",
  required,
}: MoneyInputProps) {
  return (
    <TextField
      fullWidth
      size="small"
      required={required}
      value={value}
      placeholder={placeholder}
      inputMode="numeric"
      autoComplete="off"
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 13);
        onChange(digits ? maskCurrencyBRL(digits) : "");
      }}
      slotProps={{
        input: {
          startAdornment: <InputAdornment position="start">R$</InputAdornment>,
        },
      }}
    />
  );
}
