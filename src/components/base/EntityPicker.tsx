import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import EntityAvatar from "./Avatar";

export interface PickerItem {
  id: string;
  label: string;
  sublabel?: string;
  image?: string;
}

interface EntityPickerProps {
  items: PickerItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** Texto do atalho de cadastro (ex.: "+ Novo contato"). */
  addLabel?: string;
  onAdd?: () => void;
  loading?: boolean;
  square?: boolean;
  showAvatar?: boolean;
}

/** Busca e escolhe um registro (contato, empresa, produto, negociação), com atalho de cadastro ao lado. */
export default function EntityPicker({
  items,
  value,
  onChange,
  placeholder = "Buscar",
  addLabel,
  onAdd,
  loading,
  square,
  showAvatar = true,
}: EntityPickerProps) {
  const selected = items.find((item) => item.id === value) || null;
  return (
    <div className="flex gap-2">
      <Autocomplete
        fullWidth
        size="small"
        options={items}
        loading={loading}
        value={selected}
        onChange={(_, item) => onChange(item?.id || "")}
        getOptionLabel={(item) => item.label}
        isOptionEqualToValue={(option, current) => option.id === current.id}
        noOptionsText="Nada encontrado"
        filterOptions={(options, state) => {
          const term = state.inputValue
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .toLowerCase();
          return options.filter((item) =>
            `${item.label} ${item.sublabel || ""}`
              .normalize("NFD")
              .replace(/[̀-ͯ]/g, "")
              .toLowerCase()
              .includes(term),
          );
        }}
        renderOption={({ key, ...props }, item) => (
          <li key={key} {...props}>
            <div className="flex min-w-0 items-center gap-2.5">
              {showAvatar ? <EntityAvatar name={item.label} image={item.image} square={square} size={28} /> : null}
              <div className="min-w-0">
                <p className="truncate text-sm">{item.label}</p>
                {item.sublabel ? <p className="truncate text-xs text-charcoal/50">{item.sublabel}</p> : null}
              </div>
            </div>
          </li>
        )}
        renderInput={(params) => <TextField {...params} placeholder={placeholder} />}
      />
      {onAdd ? (
        <button type="button" className="btn-secondary shrink-0 !px-3 !py-2 text-xs" onClick={onAdd}>
          {addLabel || "+ Novo"}
        </button>
      ) : null}
    </div>
  );
}
