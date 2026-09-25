import { BRIEFING_TYPES, defaultSpecific, type BriefingType } from "./templates";

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
  delivery: {
    format: string;
    deadline: string;
    revisions: string;
    channel: string;
    portfolio: boolean;
  };
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
    delivery: { format: "Vertical 9:16", deadline: "", revisions: "2", channel: "Instagram", portfolio: true },
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
    delivery: { ...base.delivery, ...(partial.delivery || {}) },
  };
}

export function titleOf(data: BriefingData) {
  return data.client.projectName.trim() || data.client.clientName.trim() || "Briefing sem nome";
}
