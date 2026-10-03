import type { OptionItem } from "@/types";
import { isCustomType, newFieldId, type BriefingCustomField, type BriefingCustomType } from "./model";
import { BRIEFING_TYPES, type BriefingType } from "./templates";

/** Catálogo de campos extras (Configurações → Listas de opções → Campos extras do briefing). */
export const BRIEFING_FIELD_LIST = "briefingField";

export interface CatalogField {
  type: BriefingCustomType;
  /** Tipo de briefing em que o campo é sugerido ("" = todos). */
  template: BriefingType | "";
  options: string[];
}

/** Tipo, modelo e opções guardados no `meta` da opção. */
export function catalogField(option: Pick<OptionItem, "meta">): CatalogField {
  const meta = option.meta || {};
  return {
    type: isCustomType(meta.type) ? meta.type : "text",
    template: BRIEFING_TYPES.includes(meta.template as BriefingType) ? (meta.template as BriefingType) : "",
    options: Array.isArray(meta.options) ? meta.options.filter((item): item is string => typeof item === "string") : [],
  };
}

/** Itens do catálogo sugeridos para um tipo de briefing. */
export function catalogFor(options: OptionItem[], type: BriefingType) {
  return options.filter((option) => {
    const { template } = catalogField(option);
    return !template || template === type;
  });
}

export function fieldFromCatalog(option: OptionItem): BriefingCustomField {
  const { type, options } = catalogField(option);
  return { id: newFieldId(), label: option.label, type, options, value: "" };
}

/** "a, b , c" → ["a", "b", "c"]. */
export function parseOptions(text: string) {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
