import { api } from "@/lib/api";

export type IntegrationProvider = "zapi" | "assinafy" | "anthropic" | "automation";

/** Integração da empresa ativa. Os segredos nunca voltam do servidor: só se estão preenchidos. */
export interface Integration {
  provider: IntegrationProvider;
  enabled: boolean;
  config: Record<string, unknown>;
  secrets: Record<string, boolean>;
  /** Parte final das URLs de webhook desta empresa. */
  hookKey: string;
}

export interface IntegrationInput {
  enabled?: boolean;
  config?: Record<string, unknown>;
  /** "" apaga; ausente não muda. */
  secrets?: Record<string, string>;
}

export const integrationsApi = {
  list: async () => (await api.get<{ data: Integration[] }>("/integrations")).data.data,
  update: async (provider: IntegrationProvider, input: IntegrationInput) =>
    (await api.put<{ data: Integration }>(`/integrations/${provider}`, input)).data.data,
};

/** Endereço público do backend (para montar as URLs de webhook). */
export function apiBaseUrl() {
  const base = api.defaults.baseURL || "";
  return /^https?:/.test(base) ? base.replace(/\/$/, "") : `${typeof window !== "undefined" ? window.location.origin : ""}${base}`;
}

/** URL de webhook de uma integração: `${API}/public/webhooks/<provider>/<hookKey>`. */
export function webhookUrl(provider: IntegrationProvider, hookKey: string) {
  return `${apiBaseUrl()}/public/webhooks/${provider}/${hookKey}`;
}
