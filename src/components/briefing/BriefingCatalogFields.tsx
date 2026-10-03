import { useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { catalogField, parseOptions, type CatalogField } from "@/lib/briefing/catalog";
import { CUSTOM_FIELD_TYPES } from "@/lib/briefing/model";
import { BRIEFING_TEMPLATES, BRIEFING_TYPES } from "@/lib/briefing/templates";
import { resources } from "@/lib/resources";
import type { OptionItem } from "@/types";

const typeLabel = (type: string) => CUSTOM_FIELD_TYPES.find((item) => item.value === type)?.label || type;

/** Tipo, modelo de briefing e opções de um campo do catálogo (extra da lista "Campos extras"). */
export default function BriefingCatalogFields({ item, editable }: { item: OptionItem; editable: boolean }) {
  const { upsertOption } = useWorkspace();
  const saved = catalogField(item);
  const savedOptions = saved.options.join(", ");
  const [options, setOptions] = useState(savedOptions);
  const [error, setError] = useState(false);

  useEffect(() => setOptions(savedOptions), [savedOptions]);

  async function save(changes: Partial<CatalogField>) {
    const next = { ...saved, ...changes };
    if (next.type === saved.type && next.template === saved.template && next.options.join(", ") === savedOptions) return;
    setError(false);
    try {
      upsertOption(await resources.options.update(item._id, { meta: { ...(item.meta || {}), ...next } }));
    } catch {
      setError(true);
    }
  }

  if (!editable) {
    return (
      <span className="shrink-0 text-xs text-charcoal/50">
        {typeLabel(saved.type)} · {saved.template ? BRIEFING_TEMPLATES[saved.template].title : "Todos os briefings"}
      </span>
    );
  }

  const selectClass = `input-search !w-40 !py-1.5 text-sm ${error ? "!border-burgundy" : ""}`;
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5" title={error ? "Não foi possível salvar." : undefined}>
      <select className={selectClass} aria-label={`Tipo de ${item.label}`} value={saved.type} onChange={(e) => void save({ type: e.target.value as CatalogField["type"] })}>
        {CUSTOM_FIELD_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        aria-label={`Briefing em que ${item.label} aparece`}
        value={saved.template}
        onChange={(e) => void save({ template: e.target.value as CatalogField["template"] })}
      >
        <option value="">Todos os briefings</option>
        {BRIEFING_TYPES.map((type) => (
          <option key={type} value={type}>
            {BRIEFING_TEMPLATES[type].title}
          </option>
        ))}
      </select>
      {saved.type === "select" ? (
        <input
          className={`input-search !w-56 !py-1.5 text-sm ${error ? "!border-burgundy" : ""}`}
          placeholder="Opções, separadas por vírgula"
          aria-label={`Opções de ${item.label}`}
          value={options}
          onChange={(e) => setOptions(e.target.value)}
          onBlur={() => void save({ options: parseOptions(options) })}
        />
      ) : null}
    </div>
  );
}
