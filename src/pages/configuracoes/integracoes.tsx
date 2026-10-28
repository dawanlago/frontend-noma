import { useEffect, useState } from "react";
import Head from "next/head";
import SettingsHeader from "@/components/settings/SettingsHeader";
import CopyButton from "@/components/tools/CopyButton";
import Field from "@/components/tools/Field";
import Select from "@/components/ui/Select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { integrationsApi, webhookUrl, type Integration, type IntegrationProvider } from "@/lib/integrations";

type FieldDef =
  | { key: string; label: string; kind: "text" | "textarea"; hint?: string; placeholder?: string }
  | { key: string; label: string; kind: "secret"; hint?: string }
  | { key: string; label: string; kind: "bool"; hint?: string }
  | { key: string; label: string; kind: "select"; hint?: string; options: { value: string; label: string }[] }
  | { key: string; label: string; kind: "funnel"; hint?: string };

interface ProviderDef {
  provider: IntegrationProvider;
  title: string;
  description: string;
  /** Mostra a URL de webhook para colar no painel do serviço. */
  webhook?: string;
  fields: FieldDef[];
}

const PROVIDERS: ProviderDef[] = [
  {
    provider: "zapi",
    title: "WhatsApp (Z-API)",
    description: "Conecta o número da produtora: conversas dentro do sistema, leads automáticos no CRM e confirmação de agendamento pelo WhatsApp.",
    webhook: "Cole a mesma URL em Z-API → Webhooks: \"Ao receber\", \"Ao enviar\" e \"Status da mensagem\" (ative também \"notificar enviadas por mim\").",
    fields: [
      { key: "instanceId", label: "ID da instância", kind: "text" },
      { key: "token", label: "Token da instância", kind: "secret" },
      { key: "clientToken", label: "Client-Token (segurança da conta)", kind: "secret", hint: "Em Z-API → Segurança. Deixe vazio se não usa." },
      { key: "autoCreateLeads", label: "Criar negociação para quem mandar mensagem e ainda não está no CRM", kind: "bool" },
      { key: "funnelId", label: "Funil dos leads do WhatsApp", kind: "funnel" },
      { key: "confirmBookings", label: "Confirmar reuniões agendadas pelo WhatsApp", kind: "bool" },
    ],
  },
  {
    provider: "assinafy",
    title: "Assinatura de contratos (Assinafy)",
    description: "Envia o contrato para assinatura eletrônica e acompanha quem já assinou.",
    webhook: "Cole em Assinafy → Configurações → Webhooks.",
    fields: [
      { key: "accountId", label: "ID da conta (workspace)", kind: "text" },
      { key: "apiKey", label: "Chave de API", kind: "secret" },
      {
        key: "environment",
        label: "Ambiente",
        kind: "select",
        options: [
          { value: "production", label: "Produção" },
          { value: "sandbox", label: "Sandbox (testes)" },
        ],
      },
    ],
  },
  {
    provider: "anthropic",
    title: "Inteligência artificial (Claude)",
    description:
      "Escreve a mensagem de confirmação (WhatsApp e e-mail) quando um lead agenda uma reunião. Sem chave ou se a IA falhar, vai o texto padrão do link de agendamento.",
    fields: [
      { key: "apiKey", label: "Chave de API da Anthropic", kind: "secret", hint: "Vazio: usa a chave do servidor (ANTHROPIC_API_KEY), se houver." },
      {
        key: "model",
        label: "Modelo",
        kind: "select",
        hint: "Padrão: Claude Opus 5.5.",
        options: [
          { value: "claude-opus-5-5", label: "Claude Opus 5.5 (padrão)" },
          { value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
          { value: "claude-haiku-5-5", label: "Claude Haiku 5.5 (mais econômico)" },
        ],
      },
      {
        key: "bookingPrompt",
        label: "Instruções para a mensagem",
        kind: "textarea",
        placeholder: "Ex.: Tom acolhedor, assine como Equipe Noma, lembre de trazer referências de vídeos que gosta.",
      },
    ],
  },
];

function ProviderCard({ def, initial, onSaved }: { def: ProviderDef; initial?: Integration; onSaved: (item: Integration) => void }) {
  const { funnels } = useWorkspace();
  const [enabled, setEnabled] = useState(Boolean(initial?.enabled));
  const [config, setConfig] = useState<Record<string, unknown>>(initial?.config || {});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEnabled(Boolean(initial?.enabled));
    setConfig(initial?.config || {});
  }, [initial]);

  async function save(extra: Record<string, string> = {}) {
    setBusy(true);
    setStatus("");
    try {
      const filled = Object.fromEntries(Object.entries({ ...secrets, ...extra }).filter(([, value]) => value !== undefined));
      onSaved(await integrationsApi.update(def.provider, { enabled, config, secrets: filled }));
      setSecrets({});
      setStatus("Salvo.");
    } catch (err) {
      setStatus(apiError(err, "Não foi possível salvar."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card grid gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal">{def.title}</h2>
          <p className="mt-1 max-w-xl text-sm text-charcoal/55">{def.description}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-charcoal">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Ativada
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {def.fields.map((field) => {
          const value = config[field.key];
          if (field.kind === "secret") {
            const filled = initial?.secrets?.[field.key];
            return (
              <Field key={field.key} label={field.label} hint={field.hint}>
                <div className="flex gap-2">
                  <input
                    className="input-search"
                    type="password"
                    autoComplete="off"
                    value={secrets[field.key] || ""}
                    placeholder={filled ? "•••••••• (salvo — digite para trocar)" : ""}
                    onChange={(e) => setSecrets({ ...secrets, [field.key]: e.target.value })}
                  />
                  {filled ? (
                    <button type="button" className="btn-secondary shrink-0" disabled={busy} onClick={() => void save({ [field.key]: "" })}>
                      Apagar
                    </button>
                  ) : null}
                </div>
              </Field>
            );
          }
          if (field.kind === "bool") {
            return (
              <label key={field.key} className="flex items-start gap-2 text-sm text-charcoal sm:col-span-2">
                <input type="checkbox" className="mt-1" checked={Boolean(value)} onChange={(e) => setConfig({ ...config, [field.key]: e.target.checked })} />
                <span>
                  {field.label}
                  {field.hint ? <span className="block text-xs text-charcoal/50">{field.hint}</span> : null}
                </span>
              </label>
            );
          }
          if (field.kind === "select" || field.kind === "funnel") {
            const options =
              field.kind === "funnel"
                ? [{ value: "", label: "Primeiro funil" }, ...funnels.map((item) => ({ value: item._id, label: item.name }))]
                : field.options;
            return (
              <Field key={field.key} label={field.label} hint={field.hint}>
                <Select value={String(value || "")} onChange={(next) => setConfig({ ...config, [field.key]: next })} options={options} placeholder="Escolha" />
              </Field>
            );
          }
          if (field.kind === "textarea") {
            return (
              <Field key={field.key} label={field.label} hint={field.hint} full>
                <textarea
                  className="input-search min-h-[88px] resize-y"
                  value={String(value || "")}
                  placeholder={field.placeholder}
                  onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                />
              </Field>
            );
          }
          return (
            <Field key={field.key} label={field.label} hint={field.hint}>
              <input className="input-search" value={String(value || "")} placeholder={field.placeholder} onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })} />
            </Field>
          );
        })}
      </div>

      {def.webhook && initial?.hookKey ? (
        <div className="rounded-lg bg-beige px-3 py-2.5">
          <p className="text-xs font-semibold text-charcoal/70">URL de webhook</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all text-xs text-charcoal">{webhookUrl(def.provider, initial.hookKey)}</code>
            <CopyButton text={webhookUrl(def.provider, initial.hookKey)} label="Copiar" className="btn-secondary !py-1.5" />
          </div>
          <p className="mt-1 text-xs text-charcoal/50">{def.webhook}</p>
        </div>
      ) : def.webhook ? (
        <p className="text-xs text-charcoal/50">Salve uma vez para gerar a URL de webhook.</p>
      ) : null}

      {status ? <p className={`text-sm ${status === "Salvo." ? "text-sage" : "text-burgundy"}`}>{status}</p> : null}
      <div className="flex justify-end">
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>
          {busy ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </section>
  );
}

/** Chaves e conexões com serviços externos da empresa ativa. */
export default function IntegrationsSettingsPage() {
  const [items, setItems] = useState<Integration[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    integrationsApi
      .list()
      .then(setItems)
      .catch((err) => setError(apiError(err, "Não foi possível carregar as integrações.")));
  }, []);

  function replace(item: Integration) {
    setItems((current) => [...current.filter((other) => other.provider !== item.provider), item]);
  }

  return (
    <>
      <Head>
        <title>Integrações | Configurações | Noma</title>
      </Head>
      <SettingsHeader
        title="Integrações"
        description="Conecte o WhatsApp, a assinatura de contratos e a inteligência artificial. As chaves ficam criptografadas e nunca aparecem de novo na tela."
      />
      {error ? <p className="mb-4 text-sm text-burgundy">{error}</p> : null}
      <div className="grid max-w-3xl gap-5">
        {PROVIDERS.map((def) => (
          <ProviderCard key={def.provider} def={def} initial={items.find((item) => item.provider === def.provider)} onSaved={replace} />
        ))}
      </div>
    </>
  );
}
