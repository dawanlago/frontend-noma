import { useEffect, useMemo, useState, type ReactNode } from "react";
import Head from "next/head";
import SettingsHeader from "@/components/settings/SettingsHeader";
import CopyButton from "@/components/tools/CopyButton";
import Field from "@/components/tools/Field";
import { confirmDialog } from "@/components/ui/DialogHost";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import {
  automationApi,
  publicApiUrl,
  type ApiTokenItem,
  type AutomationDefaults,
  type AutomationSchema,
} from "@/lib/automation";
import type { User } from "@/types";
import { formatDateTime } from "@/utils/format";

const TOKEN_EXAMPLE = "noma_live_SEU_TOKEN";

/** Bloco de código com botão de copiar. */
function Code({ children }: { children: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-beige px-3 py-2.5 pr-20 text-xs leading-relaxed text-charcoal">
        <code>{children}</code>
      </pre>
      <CopyButton text={children} label="Copiar" className="btn-secondary absolute right-2 top-2 !px-2 !py-1 text-xs" />
    </div>
  );
}

function Section({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="card grid gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal">{title}</h2>
          {description ? <p className="mt-1 max-w-2xl text-sm text-charcoal/55">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-charcoal/[0.08]">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-beige text-xs font-semibold text-charcoal/70">
          <tr>
            {head.map((cell) => (
              <th key={cell} className="px-3 py-2">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-charcoal/[0.06] align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-charcoal/80">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Tokens: criar (mostra uma vez), listar e revogar. */
function TokensCard() {
  const [items, setItems] = useState<ApiTokenItem[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [created, setCreated] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    automationApi
      .listTokens()
      .then(setItems)
      .catch((err) => setError(apiError(err, "Não foi possível carregar os tokens.")));
  }, []);

  function close() {
    setCreating(false);
    setCreated("");
    setName("");
    setError("");
  }

  async function create() {
    setBusy(true);
    setError("");
    try {
      const result = await automationApi.createToken(name.trim() || "Token de automação");
      setItems((current) => [result.item, ...current]);
      setCreated(result.token);
    } catch (err) {
      setError(apiError(err, "Não foi possível criar o token."));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(item: ApiTokenItem) {
    const ok = await confirmDialog({
      title: `Revogar "${item.name}"?`,
      message: "O sistema que usa este token para de conseguir enviar leads na hora. Não dá para desfazer.",
      confirmLabel: "Revogar",
      danger: true,
    });
    if (!ok) return;
    try {
      const updated = await automationApi.revokeToken(item._id);
      setItems((current) => current.map((other) => (other._id === updated._id ? updated : other)));
    } catch (err) {
      setError(apiError(err, "Não foi possível revogar o token."));
    }
  }

  return (
    <Section
      title="Tokens de acesso"
      description="Cada sistema externo usa o próprio token. Ele identifica a empresa e só aparece uma vez, ao ser criado; guardamos apenas uma impressão dele."
      actions={
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          Novo token
        </button>
      }
    >
      {error && !creating ? <p className="text-sm text-burgundy">{error}</p> : null}
      {items.length ? (
        <Table
          head={["Nome", "Token", "Criado", "Último uso", ""]}
          rows={items.map((item) => [
            <span key="name" className={`font-semibold ${item.revokedAt ? "text-charcoal/40 line-through" : "text-charcoal"}`}>
              {item.name}
            </span>,
            <code key="prefix" className="text-xs">
              {item.prefix}…
            </code>,
            <span key="created" className="text-xs">
              {formatDateTime(item.createdAt)}
              {item.createdByName ? <span className="block text-charcoal/50">por {item.createdByName}</span> : null}
            </span>,
            <span key="used" className="text-xs">
              {item.lastUsedAt ? formatDateTime(item.lastUsedAt) : "Nunca usado"}
            </span>,
            item.revokedAt ? (
              <span key="status" className="text-xs font-semibold text-burgundy">
                Revogado em {formatDateTime(item.revokedAt)}
              </span>
            ) : (
              <button key="revoke" type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => void revoke(item)}>
                Revogar
              </button>
            ),
          ])}
        />
      ) : (
        <p className="text-sm text-charcoal/50">Nenhum token criado ainda.</p>
      )}

      <Modal
        open={creating}
        onClose={close}
        title={created ? "Token criado" : "Novo token"}
        description={created ? "Copie agora: por segurança, ele não aparece de novo." : "Dê um nome para saber depois quem usa este token."}
        footer={
          created ? (
            <button type="button" className="btn-primary" onClick={close}>
              Já copiei
            </button>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={close}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" disabled={busy} onClick={() => void create()}>
                {busy ? "Criando..." : "Criar token"}
              </button>
            </>
          )
        }
      >
        {created ? (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-beige px-3 py-2.5">
              <code className="min-w-0 flex-1 break-all text-sm text-charcoal">{created}</code>
              <CopyButton text={created} label="Copiar" className="btn-primary !py-1.5" />
            </div>
            <p className="text-xs text-charcoal/55">Se perder o token, revogue este e crie outro.</p>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <Field label="Nome">
              <input className="input-search" autoFocus value={name} maxLength={80} placeholder="Ex.: Automação do Leo" onChange={(e) => setName(e.target.value)} />
            </Field>
            {error ? <p className="mt-2 text-sm text-burgundy">{error}</p> : null}
          </form>
        )}
      </Modal>
    </Section>
  );
}

/** Funil, etapa e responsável dos leads que chegam pela API. */
function DefaultsCard({ onSaved }: { onSaved: () => void }) {
  const { funnels } = useWorkspace();
  const [form, setForm] = useState<AutomationDefaults>({ funnelId: "", stageId: "", ownerId: "" });
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    automationApi
      .getDefaults()
      .then(setForm)
      .catch((err) => setStatus(apiError(err, "Não foi possível carregar os padrões.")));
    resources.users
      .list()
      .then((list) => setUsers(list.filter((user) => user.isActive)))
      .catch(() => setUsers([]));
  }, []);

  const funnel = funnels.find((item) => item._id === form.funnelId) || funnels[0];
  const stages = (funnel?.stages || []).filter((stage) => stage.kind === "open");

  async function save() {
    setBusy(true);
    setStatus("");
    try {
      setForm(await automationApi.saveDefaults(form));
      setStatus("Salvo.");
      onSaved();
    } catch (err) {
      setStatus(apiError(err, "Não foi possível salvar."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      title="Padrões dos leads da API"
      description="Valem para negociações novas quando o sistema externo não informa funil ou etapa. Negociações já abertas continuam onde estão."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Funil">
          <Select
            value={form.funnelId}
            onChange={(next) => setForm({ ...form, funnelId: next, stageId: "" })}
            options={[{ value: "", label: "Primeiro funil" }, ...funnels.map((item) => ({ value: item._id, label: item.name }))]}
            placeholder="Primeiro funil"
          />
        </Field>
        <Field label="Etapa de entrada">
          <Select
            value={form.stageId}
            onChange={(next) => setForm({ ...form, stageId: next })}
            options={[{ value: "", label: "Primeira etapa" }, ...stages.map((stage) => ({ value: stage._id, label: stage.name }))]}
            placeholder="Primeira etapa"
          />
        </Field>
        <Field label="Responsável">
          <Select
            value={form.ownerId}
            onChange={(next) => setForm({ ...form, ownerId: next })}
            options={[{ value: "", label: "Primeiro administrador" }, ...users.map((user) => ({ value: user._id, label: user.name }))]}
            placeholder="Primeiro administrador"
          />
        </Field>
      </div>
      {status ? <p className={`text-sm ${status === "Salvo." ? "text-sage" : "text-burgundy"}`}>{status}</p> : null}
      <div className="flex justify-end">
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>
          {busy ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </Section>
  );
}

const ERRORS: [string, string][] = [
  ["200", "Lead já existia: contato e negociação aberta foram atualizados."],
  ["201", "Negociação nova criada."],
  ["400", "JSON malformado no corpo."],
  ["401", "Token ausente, inválido ou revogado."],
  ["404", "GET /leads: contato não encontrado. Outras rotas: caminho inexistente."],
  ["415", "Corpo sem Content-Type: application/json."],
  ["422", "Dados inválidos. Veja details: [{ field, message }]."],
  ["429", `Limite de requisições por minuto excedido. Aguarde o tempo do header Retry-After.`],
  ["500", "Erro interno. Tente de novo; se persistir, avise a produtora."],
];

/** Documentação para o parceiro que integra o sistema externo. */
function DocsCard({ schema }: { schema: AutomationSchema | null }) {
  const base = publicApiUrl();
  const customExample = schema?.customFields[0];
  const briefingBody = useMemo(
    () =>
      JSON.stringify(
        {
          phone: "11987654321",
          email: "ana@exemplo.com",
          stage: "qualified",
          source: "Formulário de briefing",
          notes: "Vídeo institucional, entrega em março.",
          ...(customExample ? { custom: { [customExample.key]: customExample.options?.[0] || "valor" } } : {}),
        },
        null,
        2,
      ),
    [customExample],
  );

  const curlWhatsapp = `curl -X POST "${base}/leads" \\
  -H "Authorization: Bearer ${TOKEN_EXAMPLE}" \\
  -H "Content-Type: application/json" \\
  -d '{
  "name": "Ana Souza",
  "phone": "+55 (11) 98765-4321",
  "source": "WhatsApp",
  "externalId": "wa-123"
}'`;
  const curlBriefing = `curl -X POST "${base}/leads" \\
  -H "Authorization: Bearer ${TOKEN_EXAMPLE}" \\
  -H "Content-Type: application/json" \\
  -d '${briefingBody}'`;
  const curlGet = `curl "${base}/leads?phone=5511987654321" \\
  -H "Authorization: Bearer ${TOKEN_EXAMPLE}"`;
  const curlSchema = `curl "${base}/schema" \\
  -H "Authorization: Bearer ${TOKEN_EXAMPLE}"`;

  const created = `HTTP 201
{
  "data": {
    "contactId": "6650f1c2a1b2c3d4e5f60718",
    "leadId": "6650f1c2a1b2c3d4e5f60719",
    "created": true,
    "contactCreated": true,
    "stage": { "id": "…", "name": "Novo lead", "kind": "open", "qualified": false, "funnelId": "…", "funnelName": "Vendas" },
    "externalId": "wa-123"
  }
}`;
  const updated = `HTTP 200
{
  "data": {
    "contactId": "6650f1c2a1b2c3d4e5f60718",
    "leadId": "6650f1c2a1b2c3d4e5f60719",
    "created": false,
    "contactCreated": false,
    "stage": { "id": "…", "name": "Qualificado", "kind": "open", "qualified": true, "funnelId": "…", "funnelName": "Vendas" }
  },
  "warnings": ["Campo \\"cidade\\" ignorado (não existe na API)."]
}`;
  const invalid = `HTTP 422
{
  "error": "Dados inválidos.",
  "details": [
    { "field": "phone", "message": "Telefone inválido. Use DDD + número, com ou sem 55 (ex.: 11987654321)." },
    { "field": "custom.orcamento", "message": "Campo personalizado inexistente." }
  ]
}`;
  const found = `HTTP 200
{
  "data": {
    "contactId": "…",
    "contact": { "name": "Ana Souza", "phone": "5511987654321", "email": "ana@exemplo.com", "instagram": "" },
    "lead": { "leadId": "…", "status": "open", "source": "WhatsApp", "stage": { "name": "Novo lead", "qualified": false, … }, "createdAt": "…", "updatedAt": "…" }
  }
}`;

  return (
    <Section
      title="Documentação da API"
      description="Envie esta seção para quem vai integrar o sistema externo (ex.: o Leo). Os IDs de funis, etapas e campos abaixo são desta empresa."
    >
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold text-charcoal">URL base</h3>
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-beige px-3 py-2.5">
          <code className="min-w-0 flex-1 break-all text-xs text-charcoal">{base}</code>
          <CopyButton text={base} label="Copiar" className="btn-secondary !py-1.5" />
        </div>
      </div>

      <div className="grid gap-2 text-sm text-charcoal/75">
        <h3 className="text-sm font-semibold text-charcoal">Autenticação</h3>
        <p>
          Toda chamada leva o header <code className="text-xs">Authorization: Bearer noma_live_…</code> com um token criado acima. O token define a empresa: não
          é preciso informar nada além dele. Envie o corpo em JSON (<code className="text-xs">Content-Type: application/json</code>). Limite:{" "}
          {schema?.rateLimit.requests ?? 60} requisições por minuto por token (headers <code className="text-xs">X-RateLimit-*</code>).
        </p>
      </div>

      <div className="grid gap-2 rounded-lg border border-sage/40 bg-sage/10 px-4 py-3 text-sm text-charcoal/80">
        <h3 className="text-sm font-semibold text-charcoal">Fluxo WhatsApp → briefing, sem duplicar</h3>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            O lead manda mensagem no WhatsApp: envie <code className="text-xs">POST /leads</code> com nome e telefone. O CRM cria o contato e abre a negociação na
            primeira etapa do funil (ou na etapa padrão acima) e responde <b>201</b>.
          </li>
          <li>
            Ele responde o formulário de briefing: envie <code className="text-xs">POST /leads</code> de novo com o <b>mesmo telefone</b> (e o e-mail, se tiver) e{" "}
            <code className="text-xs">&quot;stage&quot;: &quot;qualified&quot;</code>. O CRM acha o contato pelo telefone, reaproveita a mesma negociação, move para a
            etapa de qualificado e responde <b>200</b>.
          </li>
          <li>
            O telefone é comparado sem máscara, com ou sem 55 e com ou sem o 9 extra, e depois pelo e-mail: o mesmo cliente nunca vira dois contatos nem dois
            cartões. Para conferir antes, use <code className="text-xs">GET /leads?phone=…</code>.
          </li>
        </ol>
        <p className="text-xs text-charcoal/55">
          Se você enviar <code>funnelId</code>, a negociação aberta é procurada só nesse funil. Sem ele, qualquer negociação aberta do contato é reaproveitada.
        </p>
      </div>

      <div className="grid gap-2">
        <h3 className="text-sm font-semibold text-charcoal">POST /leads — campos</h3>
        {schema ? (
          <Table
            head={["Campo", "Tipo", "Obrigatório", "Regras"]}
            rows={schema.fields.map((field) => [
              <code key="name" className="text-xs font-semibold text-charcoal">
                {field.name}
              </code>,
              <span key="type" className="text-xs">
                {field.type}
              </span>,
              <span key="req" className="text-xs">
                {field.required === true ? "Sim" : field.required ? field.required : "Não"}
              </span>,
              <span key="desc" className="text-xs">
                {field.description}
                {field.maxLength ? ` Máx. ${field.maxLength} caracteres.` : ""}
                {field.default ? ` Padrão: "${field.default}".` : ""}
                {field.example ? ` Ex.: ${field.example}` : ""}
              </span>,
            ])}
          />
        ) : (
          <p className="text-sm text-charcoal/50">Carregando…</p>
        )}
      </div>

      {schema?.funnels.length ? (
        <div className="grid gap-2">
          <h3 className="text-sm font-semibold text-charcoal">Funis e etapas (funnelId / stageId)</h3>
          <Table
            head={["Funil", "Etapa", "stageId"]}
            rows={schema.funnels.flatMap((funnel) =>
              funnel.stages.map((stage, index) => [
                index === 0 ? (
                  <span key="funnel" className="text-xs">
                    <b className="text-charcoal">{funnel.name}</b>
                    <code className="block break-all text-[11px] text-charcoal/50">{funnel.id}</code>
                  </span>
                ) : (
                  ""
                ),
                <span key="stage" className="text-xs">
                  {stage.name}
                  {stage.qualified ? <span className="ml-1 font-semibold text-sage">(qualificado)</span> : null}
                  {stage.kind !== "open" ? <span className="ml-1 text-charcoal/40">({stage.kind === "won" ? "ganha" : "perdida"})</span> : null}
                </span>,
                <code key="id" className="break-all text-[11px]">
                  {stage.id}
                </code>,
              ]),
            )}
          />
        </div>
      ) : null}

      <div className="grid gap-2">
        <h3 className="text-sm font-semibold text-charcoal">Campos personalizados (custom)</h3>
        {schema?.customFields.length ? (
          <Table
            head={["Chave", "Nome", "Tipo", "Opções"]}
            rows={schema.customFields.map((field) => [
              <code key="key" className="text-xs font-semibold text-charcoal">
                {field.key}
              </code>,
              <span key="label" className="text-xs">
                {field.label}
              </span>,
              <span key="type" className="text-xs">
                {field.type}
              </span>,
              <span key="options" className="text-xs">
                {field.options?.length ? field.options.join(", ") : "—"}
              </span>,
            ])}
          />
        ) : (
          <p className="text-sm text-charcoal/50">Nenhum campo personalizado de negociação. Crie em Configurações → Campos personalizados.</p>
        )}
      </div>

      <div className="grid gap-3">
        <h3 className="text-sm font-semibold text-charcoal">Exemplos</h3>
        <p className="text-xs text-charcoal/55">1. Lead chegou pelo WhatsApp (cria a negociação na primeira etapa):</p>
        <Code>{curlWhatsapp}</Code>
        <p className="text-xs text-charcoal/55">2. Mesmo lead respondeu o briefing (mesmo cartão vai para qualificado):</p>
        <Code>{curlBriefing}</Code>
        <p className="text-xs text-charcoal/55">3. Consultar se o contato já tem negociação aberta (phone ou email):</p>
        <Code>{curlGet}</Code>
        <p className="text-xs text-charcoal/55">4. Campos, funis, etapas e campos personalizados em JSON:</p>
        <Code>{curlSchema}</Code>
      </div>

      <div className="grid gap-3">
        <h3 className="text-sm font-semibold text-charcoal">Respostas</h3>
        <Code>{created}</Code>
        <Code>{updated}</Code>
        <Code>{found}</Code>
        <Code>{invalid}</Code>
      </div>

      <div className="grid gap-2">
        <h3 className="text-sm font-semibold text-charcoal">Códigos HTTP</h3>
        <p className="text-xs text-charcoal/55">
          Erros sempre em JSON: <code>{"{ \"error\": \"mensagem\", \"details\"?: [...] }"}</code>.
        </p>
        <Table
          head={["Código", "Quando"]}
          rows={ERRORS.map(([code, text]) => [
            <code key="code" className="text-xs font-semibold text-charcoal">
              {code}
            </code>,
            <span key="text" className="text-xs">
              {text}
            </span>,
          ])}
        />
      </div>
    </Section>
  );
}

/** API de automação: tokens, padrões e documentação para sistemas externos que mandam leads. */
export default function AutomationSettingsPage() {
  const [schema, setSchema] = useState<AutomationSchema | null>(null);
  const [error, setError] = useState("");
  // Recarrega a documentação quando os padrões mudam (funil/etapa padrão aparecem nela).
  const [version, setVersion] = useState(0);

  useEffect(() => {
    automationApi
      .schema()
      .then(setSchema)
      .catch((err) => setError(apiError(err, "Não foi possível carregar a documentação.")));
  }, [version]);

  return (
    <>
      <Head>
        <title>Automação e API | Configurações | Noma</title>
      </Head>
      <SettingsHeader
        title="Automação e API"
        description="Sistemas externos (automações de WhatsApp, formulários, parceiros) mandam leads direto para o CRM, sem duplicar contatos nem negociações."
      />
      {error ? <p className="mb-4 text-sm text-burgundy">{error}</p> : null}
      <div className="grid max-w-4xl gap-5">
        <TokensCard />
        <DefaultsCard onSaved={() => setVersion((current) => current + 1)} />
        <DocsCard schema={schema} />
      </div>
    </>
  );
}
