import { useState } from "react";
import Link from "next/link";
import { HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineTrash } from "react-icons/hi2";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { BRIEFING_FIELD_LIST, catalogFor, fieldFromCatalog, parseOptions } from "@/lib/briefing/catalog";
import { CUSTOM_FIELD_TYPES, newFieldId, type BriefingCustomField } from "@/lib/briefing/model";
import type { BriefingType } from "@/lib/briefing/templates";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";

interface CustomFieldsEditorProps {
  fields: BriefingCustomField[];
  type: BriefingType;
  onChange: (fields: BriefingCustomField[]) => void;
}

function ValueInput({ field, onChange }: { field: BriefingCustomField; onChange: (value: string) => void }) {
  if (field.type === "textarea") {
    return <textarea className="input-search resize-y" rows={3} value={field.value} onChange={(event) => onChange(event.target.value)} />;
  }
  if (field.type === "select") {
    return (
      <Select
        value={field.value}
        onChange={onChange}
        options={field.options.map((option) => ({ value: option, label: option }))}
        placeholder={field.options.length ? "Selecione" : "Cadastre as opções acima"}
      />
    );
  }
  return (
    <input
      className="input-search"
      type={field.type === "date" ? "date" : "text"}
      value={field.value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/** Campos extras do briefing: criados na hora ou trazidos do catálogo das configurações. */
export default function CustomFieldsEditor({ fields, type, onChange }: CustomFieldsEditorProps) {
  const { can } = useAuth();
  const { optionsOf, upsertOption } = useWorkspace();
  const catalog = catalogFor(optionsOf(BRIEFING_FIELD_LIST), type);
  const [status, setStatus] = useState("");

  const update = (id: string, patch: Partial<BriefingCustomField>) =>
    onChange(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  const moveField = (index: number, to: number) => {
    if (to < 0 || to >= fields.length) return;
    const next = fields.slice();
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  function addBlank() {
    onChange([...fields, { id: newFieldId(), label: "", type: "text", options: [], value: "" }]);
  }

  function addFromCatalog(optionId: string) {
    const option = catalog.find((item) => item._id === optionId);
    if (option) onChange([...fields, fieldFromCatalog(option)]);
  }

  const inCatalog = (label: string) =>
    optionsOf(BRIEFING_FIELD_LIST).some((item) => item.label.trim().toLowerCase() === label.trim().toLowerCase());

  async function saveToCatalog(field: BriefingCustomField) {
    setStatus("");
    try {
      const saved = await resources.options.create({
        list: BRIEFING_FIELD_LIST,
        label: field.label.trim(),
        meta: { type: field.type, template: type, options: field.options },
      });
      upsertOption(saved);
      setStatus(`“${saved.label}” salvo no catálogo.`);
    } catch (err) {
      setStatus(apiError(err, "Não foi possível salvar no catálogo."));
    }
  }

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="rounded-xl border border-charcoal/10 p-4">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px_auto]">
            <input
              className="input-search"
              placeholder="Nome do campo (ex.: Dress code)"
              aria-label="Nome do campo"
              value={field.label}
              onChange={(event) => update(field.id, { label: event.target.value })}
            />
            <Select
              value={field.type}
              onChange={(value) => update(field.id, { type: value as BriefingCustomField["type"] })}
              options={CUSTOM_FIELD_TYPES.map((item) => ({ value: item.value, label: item.label }))}
            />
            <div className="flex items-center justify-end gap-1">
              <button type="button" className="btn-ghost !h-8 !w-8" aria-label="Subir" disabled={index === 0} onClick={() => moveField(index, index - 1)}>
                <HiOutlineArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="btn-ghost !h-8 !w-8"
                aria-label="Descer"
                disabled={index === fields.length - 1}
                onClick={() => moveField(index, index + 1)}
              >
                <HiOutlineArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="btn-ghost !h-8 !w-8 text-burgundy"
                aria-label="Remover campo"
                onClick={() => onChange(fields.filter((item) => item.id !== field.id))}
              >
                <HiOutlineTrash className="h-4 w-4" />
              </button>
            </div>
          </div>
          {field.type === "select" ? (
            <input
              className="input-search mt-2"
              placeholder="Opções separadas por vírgula (ex.: Sim, Não, A definir)"
              aria-label="Opções do campo"
              defaultValue={field.options.join(", ")}
              onBlur={(event) => update(field.id, { options: parseOptions(event.target.value) })}
            />
          ) : null}
          <div className="mt-3">
            <ValueInput field={field} onChange={(value) => update(field.id, { value })} />
          </div>
          {field.label.trim() && !inCatalog(field.label) ? (
            <button type="button" className="mt-2 text-xs font-semibold text-tan hover:underline" onClick={() => void saveToCatalog(field)}>
              Salvar no catálogo para os próximos briefings
            </button>
          ) : null}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-secondary" onClick={addBlank}>
          + Adicionar campo
        </button>
        {catalog.length ? (
          <div className="w-60">
            <Select
              value=""
              onChange={addFromCatalog}
              options={catalog.map((item) => ({ value: item._id, label: item.label }))}
              placeholder="Adicionar do catálogo…"
            />
          </div>
        ) : null}
        {can("configuracoes") ? (
          <Link href={`/configuracoes/opcoes?lista=${BRIEFING_FIELD_LIST}`} className="text-xs font-semibold text-charcoal/50 hover:text-tan">
            Gerenciar catálogo
          </Link>
        ) : null}
      </div>
      {status ? <p className="text-xs text-charcoal/60">{status}</p> : null}
    </div>
  );
}
