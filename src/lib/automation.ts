import { api } from "@/lib/api";
import { apiBaseUrl } from "@/lib/integrations";

/** Token da API de automação. O valor completo só aparece ao criar. */
export interface ApiTokenItem {
  _id: string;
  name: string;
  /** Começo do token (ex.: "noma_live_Ab3x"), para reconhecer na lista. */
  prefix: string;
  createdByName: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/** Padrões para leads da API ("" = automático: primeiro funil, primeira etapa, primeiro admin). */
export interface AutomationDefaults {
  funnelId: string;
  stageId: string;
  ownerId: string;
}

export interface SchemaField {
  name: string;
  type: string;
  required: boolean | string;
  maxLength?: number;
  default?: string;
  example?: string;
  description: string;
}

/** O mesmo que o parceiro recebe em GET /public/v1/schema. */
export interface AutomationSchema {
  version: string;
  rateLimit: { requests: number; perSeconds: number };
  fields: SchemaField[];
  rules: string[];
  defaults: { funnelId: string | null; stageId: string | null };
  funnels: { id: string; name: string; stages: { id: string; name: string; kind: string; qualified: boolean }[] }[];
  customFields: { key: string; label: string; type: string; funnelId: string | null; options?: string[] }[];
}

export const automationApi = {
  listTokens: async () => (await api.get<{ data: ApiTokenItem[] }>("/automation/tokens")).data.data,
  createToken: async (name: string) =>
    (await api.post<{ data: { token: string; item: ApiTokenItem } }>("/automation/tokens", { name })).data.data,
  revokeToken: async (id: string) => (await api.delete<{ data: ApiTokenItem }>(`/automation/tokens/${id}`)).data.data,
  getDefaults: async () => (await api.get<{ data: AutomationDefaults }>("/automation/defaults")).data.data,
  saveDefaults: async (input: AutomationDefaults) => (await api.put<{ data: AutomationDefaults }>("/automation/defaults", input)).data.data,
  schema: async () => (await api.get<{ data: AutomationSchema }>("/automation/schema")).data.data,
};

/** URL base da API pública: `${API}/public/v1`. */
export function publicApiUrl() {
  return `${apiBaseUrl()}/public/v1`;
}
