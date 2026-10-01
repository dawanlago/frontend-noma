import Field from "@/components/tools/Field";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { CustomFieldEntity, CustomValues } from "@/types";
import OptionChips from "./OptionChips";
import OptionSelect from "./OptionSelect";

interface CustomFieldsInputsProps {
  entity: CustomFieldEntity;
  /** Negociações: mostra só os campos que valem para este funil. */
  funnelId?: string;
  value: CustomValues;
  onChange: (value: CustomValues) => void;
}

/** Campos personalizados (Configurações → Campos personalizados) de uma área. Use dentro de `grid sm:grid-cols-2`. */
export default function CustomFieldsInputs({ entity, funnelId, value, onChange }: CustomFieldsInputsProps) {
  const { fieldsOf } = useWorkspace();
  const fields = fieldsOf(entity, funnelId);
  if (!fields.length) return null;

  const set = (key: string, next: string | string[]) => onChange({ ...value, [key]: next });

  return (
    <>
      {fields.map((field) => {
        const current = value?.[field.key];
        const text = typeof current === "string" ? current : "";
        const list = `field:${field._id}`;
        return (
          <Field key={field._id} label={field.label} full={field.type === "textarea" || field.type === "multiselect"} group={field.type === "multiselect"}>
            {field.type === "select" ? (
              <OptionSelect list={list} value={text} emptyLabel="Não informado" onChange={(next) => set(field.key, next)} />
            ) : field.type === "multiselect" ? (
              <OptionChips list={list} value={Array.isArray(current) ? current : []} onChange={(next) => set(field.key, next)} />
            ) : field.type === "textarea" ? (
              <textarea className="input-search min-h-[80px] resize-y" value={text} onChange={(event) => set(field.key, event.target.value)} />
            ) : (
              <input
                className="input-search"
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                value={text}
                onChange={(event) => set(field.key, event.target.value)}
              />
            )}
          </Field>
        );
      })}
    </>
  );
}

/** Valores dos campos personalizados prontos para exibir (perfil, painel da negociação). */
export function useCustomFieldDisplay(entity: CustomFieldEntity, value: CustomValues | undefined, funnelId?: string) {
  const { fieldsOf, labelOf } = useWorkspace();
  return fieldsOf(entity, funnelId)
    .map((field) => {
      const current = value?.[field.key];
      const list = `field:${field._id}`;
      const text = Array.isArray(current)
        ? current.map((item) => labelOf(list, item)).join(", ")
        : field.type === "select" && current
          ? labelOf(list, current)
          : current || "";
      return { label: field.label, value: text };
    })
    .filter((item) => item.value);
}
