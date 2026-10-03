import { resources } from "@/lib/resources";
import type { ToolDocument } from "@/types";
import type { ScriptData } from "./model";

const base = resources.tools.scripts;

/** `resources.tools.scripts` com o tipo dos dados do roteiro. */
export const scriptsApi = {
  /** `briefingId` filtra os roteiros de um briefing. */
  list: (params?: { ownerId?: string; briefingId?: string }) => base.list(params),
  get: (id: string) => base.get(id) as Promise<ToolDocument<ScriptData>>,
  create: (payload: { title: string; data: ScriptData }) => base.create(payload) as Promise<ToolDocument<ScriptData>>,
  update: (id: string, payload: { title?: string; data?: ScriptData }) => base.update(id, payload) as Promise<ToolDocument<ScriptData>>,
  duplicate: (id: string) => base.duplicate(id) as Promise<ToolDocument<ScriptData>>,
  remove: base.remove,
};
