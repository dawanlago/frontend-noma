import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import OptionAddDialog from "./OptionAddDialog";

interface OptionChipsProps {
  list: string;
  value: string[];
  onChange: (value: string[]) => void;
  noAdd?: boolean;
}

/** Seleção múltipla em chips de uma lista configurável, com atalho de cadastro. */
export default function OptionChips({ list, value, onChange, noAdd }: OptionChipsProps) {
  const { optionsOf } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const items = optionsOf(list);
  const orphans = value.filter((item) => !items.some((option) => option.value === item));

  function toggle(item: string) {
    onChange(value.includes(item) ? value.filter((current) => current !== item) : [...value, item]);
  }

  const chip = (key: string, label: string) => {
    const active = value.includes(key);
    return (
      <button
        key={key}
        type="button"
        aria-pressed={active}
        onClick={() => toggle(key)}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          active ? "border-tan bg-tan/10 text-tan" : "border-charcoal/15 text-charcoal/60 hover:border-charcoal/30"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {orphans.map((item) => chip(item, item))}
      {items.map((item) => chip(item.value, item.label))}
      {!noAdd ? (
        <button
          type="button"
          className="rounded-full border border-dashed border-tan/50 px-3 py-1.5 text-xs font-semibold text-tan hover:bg-tan/5"
          onClick={() => setAdding(true)}
        >
          + Nova opção
        </button>
      ) : null}
      {!noAdd ? (
        <OptionAddDialog
          list={adding ? list : null}
          onClose={() => setAdding(false)}
          onCreated={(item) => onChange(value.includes(item.value) ? value : [...value, item.value])}
        />
      ) : null}
    </div>
  );
}
