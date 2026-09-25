import { resources } from "@/lib/resources";
import type { ToolDocument } from "@/types";
import type { BriefingData } from "./model";

const base = resources.tools.briefings;

/** `resources.tools.briefings` com o tipo dos dados do briefing. */
export const briefingsApi = {
  list: base.list,
  get: (id: string) => base.get(id) as Promise<ToolDocument<BriefingData>>,
  create: (payload: { title: string; data: BriefingData }) => base.create(payload) as Promise<ToolDocument<BriefingData>>,
  update: (id: string, payload: { title?: string; data?: BriefingData }) =>
    base.update(id, payload) as Promise<ToolDocument<BriefingData>>,
  duplicate: (id: string) => base.duplicate(id) as Promise<ToolDocument<BriefingData>>,
  remove: base.remove,
};
