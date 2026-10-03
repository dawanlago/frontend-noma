import { BRIEFING_TYPES, defaultSpecific, type BriefingType } from "./templates";

export const CUSTOM_FIELD_TYPES = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "select", label: "Lista de opções" },
  { value: "date", label: "Data" },
] as const;
export type BriefingCustomType = (typeof CUSTOM_FIELD_TYPES)[number]["value"];

/** Campo extra criado só neste briefing (ou trazido do catálogo das configurações). */
export interface BriefingCustomField {
  id: string;
  label: string;
  type: BriefingCustomType;
  /** Opções do tipo "select". */
  options: string[];
  value: string;
}

export interface BriefingData {
  type: BriefingType;
  client: {
    clientName: string;
    projectName: string;
    contact: string;
    channel: string;
  };
  goal: {
    mainGoal: string;
    audience: string;
  };
  /** Valores de cada tipo guardados separadamente: trocar de tipo não apaga o que foi digitado. */
  specific: Record<BriefingType, Record<string, string>>;
  creative: {
    references: string;
    avoid: string;
    notes: string;
  };
  /** Dados da gravação. */
  production: {
    date: string;
    time: string;
    location: string;
    notes: string;
  };
  /** Aparência do PDF: cor (vazio = cor padrão da identidade) e logo. */
  style: {
    color: string;
    showLogo: boolean;
  };
  delivery: {
    format: string;
    deadline: string;
    revisions: string;
    channel: string;
    portfolio: boolean;
  };
  /** Campos extras, na ordem em que aparecem no briefing. */
  customFields: BriefingCustomField[];
}

function defaultSpecificAll(): Record<BriefingType, Record<string, string>> {
  return Object.fromEntries(BRIEFING_TYPES.map((type) => [type, defaultSpecific(type)])) as Record<
    BriefingType,
    Record<string, string>
  >;
}

export function defaultData(): BriefingData {
  return {
    type: "social",
    client: { clientName: "", projectName: "", contact: "", channel: "" },
    goal: { mainGoal: "", audience: "" },
    specific: defaultSpecificAll(),
    creative: { references: "", avoid: "", notes: "" },
    production: { date: "", time: "", location: "", notes: "" },
    style: { color: "", showLogo: true },
    delivery: { format: "Vertical 9:16", deadline: "", revisions: "2", channel: "Instagram", portfolio: true },
    customFields: [],
  };
}

export function normalize(partial: Partial<BriefingData>): BriefingData {
  const base = defaultData();
  const specific = { ...base.specific };
  BRIEFING_TYPES.forEach((type) => {
    specific[type] = { ...base.specific[type], ...(partial.specific?.[type] || {}) };
  });
  return {
    type: BRIEFING_TYPES.includes(partial.type as BriefingType) ? (partial.type as BriefingType) : base.type,
    client: { ...base.client, ...(partial.client || {}) },
    goal: { ...base.goal, ...(partial.goal || {}) },
    specific,
    creative: { ...base.creative, ...(partial.creative || {}) },
    production: { ...base.production, ...(partial.production || {}) },
    style: { ...base.style, ...(partial.style || {}) },
    delivery: { ...base.delivery, ...(partial.delivery || {}) },
    customFields: normalizeCustomFields(partial.customFields),
  };
}

export function isCustomType(value: unknown): value is BriefingCustomType {
  return CUSTOM_FIELD_TYPES.some((type) => type.value === value);
}

function normalizeCustomFields(raw: unknown): BriefingCustomField[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : newFieldId(),
      label: typeof item.label === "string" ? item.label : "",
      type: isCustomType(item.type) ? item.type : "text",
      options: Array.isArray(item.options) ? item.options.filter((option): option is string => typeof option === "string") : [],
      value: typeof item.value === "string" ? item.value : "",
    }));
}

export function newFieldId() {
  return Math.random().toString(36).slice(2, 10);
}

export function titleOf(data: BriefingData) {
  return data.client.projectName.trim() || data.client.clientName.trim() || "Briefing sem nome";
}
