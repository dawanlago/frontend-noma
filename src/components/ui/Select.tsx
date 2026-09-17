import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import SelectMui from "@mui/material/Select";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

export default function Select({ value, onChange, options, placeholder = "Selecione" }: SelectProps) {
  return (
    <FormControl fullWidth size="small">
      <SelectMui
        displayEmpty
        value={value}
        onChange={(event) => onChange(String(event.target.value))}
        renderValue={(selected) => {
          const match = options.find((option) => option.value === selected);
          if (!selected || !match) {
            return <span style={{ color: "inherit", opacity: 0.55 }}>{placeholder}</span>;
          }
          return match.label;
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value || option.label} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </SelectMui>
    </FormControl>
  );
}
