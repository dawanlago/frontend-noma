import { useState } from "react";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import SelectMui from "@mui/material/Select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import OptionAddDialog from "./OptionAddDialog";

const ADD = "__add__";

interface OptionSelectProps {
  list: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Mostra uma opção vazia no topo (ex.: "Todos", "Não informado"). */
  emptyLabel?: string;
  /** Esconde o atalho de cadastro (ex.: em filtros). */
  noAdd?: boolean;
  disabled?: boolean;
}

/** Select de uma lista configurável, com atalho "Cadastrar nova opção". */
export default function OptionSelect({ list, value, onChange, placeholder = "Selecione", emptyLabel, noAdd, disabled }: OptionSelectProps) {
  const { optionsOf } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const items = optionsOf(list);
  // Valor gravado que não existe mais na lista continua aparecendo.
  const orphan = value && !items.some((item) => item.value === value);

  return (
    <>
      <FormControl fullWidth size="small">
        <SelectMui
          displayEmpty
          disabled={disabled}
          value={value}
          onChange={(event) => {
            const next = String(event.target.value);
            if (next === ADD) setAdding(true);
            else onChange(next);
          }}
          renderValue={(selected) => {
            const match = items.find((item) => item.value === selected);
            if (!selected) return <span style={{ opacity: 0.55 }}>{emptyLabel || placeholder}</span>;
            return match?.label || String(selected);
          }}
        >
          {emptyLabel !== undefined ? <MenuItem value="">{emptyLabel}</MenuItem> : null}
          {orphan ? <MenuItem value={value}>{value}</MenuItem> : null}
          {items.map((item) => (
            <MenuItem key={item._id} value={item.value}>
              {item.label}
            </MenuItem>
          ))}
          {!noAdd ? <Divider /> : null}
          {!noAdd ? (
            <MenuItem value={ADD} sx={{ color: "primary.main", fontWeight: 600 }}>
              + Cadastrar nova opção
            </MenuItem>
          ) : null}
        </SelectMui>
      </FormControl>
      {!noAdd ? (
        <OptionAddDialog list={adding ? list : null} onClose={() => setAdding(false)} onCreated={(item) => onChange(item.value)} />
      ) : null}
    </>
  );
}
