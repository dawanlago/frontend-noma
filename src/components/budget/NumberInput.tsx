import { useEffect, useState } from "react";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import MoneyInput from "@/components/ui/MoneyInput";
import { maskCurrencyBRL, parseCurrencyBRL } from "@/utils/format";

function parseDecimal(text: string) {
  const parsed = Number(text.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatDecimal(value: number) {
  return String(value).replace(".", ",");
}

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  /** Aceita casas decimais (ex.: 1,5 h). */
  decimal?: boolean;
}

/** Campo numérico que aceita vírgula e mantém o texto enquanto a pessoa digita. */
export function NumberInput({ value, onChange, unit, decimal = true }: NumberInputProps) {
  const [text, setText] = useState(formatDecimal(value));

  useEffect(() => {
    if (parseDecimal(text) !== value) setText(formatDecimal(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextField
      fullWidth
      size="small"
      value={text}
      inputMode={decimal ? "decimal" : "numeric"}
      autoComplete="off"
      onChange={(event) => {
        const pattern = decimal ? /[^\d,.]/g : /\D/g;
        const next = event.target.value.replace(pattern, "").slice(0, 8);
        setText(next);
        onChange(parseDecimal(next));
      }}
      onBlur={() => setText(formatDecimal(parseDecimal(text)))}
      slotProps={unit ? { input: { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } } : undefined}
    />
  );
}

/** Adaptador do MoneyInput (texto mascarado) para um valor numérico. */
export function CurrencyInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <MoneyInput value={maskCurrencyBRL(value)} onChange={(text) => onChange(parseCurrencyBRL(text))} />;
}
