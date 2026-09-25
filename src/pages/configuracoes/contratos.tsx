import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import ContractPreview from "@/components/contracts/ContractPreview";
import SettingsHeader from "@/components/settings/SettingsHeader";
import { useAsyncData } from "@/hooks/useAsyncData";
import { defaultData } from "@/lib/contracts/model";
import { buildFromTemplate, systemContractAsTemplate, TEMPLATE_VARIABLES } from "@/lib/contracts/template";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { ContractTemplate } from "@/types";

/** Dados de exemplo para a prévia do modelo. */
function sampleData() {
  const data = defaultData();
  data.type = "custom";
  data.me = { name: "Produtora Noma", document: "00.000.000/0001-00", address: "Rua Exemplo, 100", city: "Cidade", state: "UF", representative: "", email: "contato@noma.com" };
  data.other = { name: "Cliente Exemplo Ltda.", document: "11.111.111/0001-11", address: "Av. Cliente, 200", city: "Cidade", state: "UF", representative: "Maria Souza", email: "" };
  data.payment.amount = "4.500,00";
  data.scope.captureDate = "2026-10-15";
  data.scope.captureLocation = "Estúdio da produtora";
  data.signature.city = "Cidade";
  data.signature.state = "UF";
  data.signature.forum = "Cidade/UF";
  return data;
}

const BLANK_TEMPLATE = `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS AUDIOVISUAIS

Pelo presente instrumento, de um lado {{contratante.qualificacao}}, doravante CONTRATANTE, e de outro {{contratada.qualificacao}}, doravante CONTRATADA, têm entre si justo e contratado o seguinte:

## 1. DO OBJETO

1.1. A CONTRATADA prestará à CONTRATANTE os serviços de {{servico.descricao}}.

1.2. Entregáveis: {{servico.entregaveis}}.

## 2. DO VALOR E PAGAMENTO

2.1. Pelos serviços, a CONTRATANTE pagará {{valor}}, na condição: {{pagamento.condicao}}, com vencimento em {{pagamento.vencimento}}.`;

export default function ContractTemplatesPage() {
  const { data, isLoading, reload } = useAsyncData(() => resources.contractTemplates.list());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Pick<ContractTemplate, "name" | "body" | "isDefault"> | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const templates = useMemo(() => data || [], [data]);
  const selected = templates.find((item) => item._id === selectedId) || null;

  useEffect(() => {
    if (selectedId === null && templates.length) setSelectedId(templates[0]._id);
  }, [selectedId, templates]);

  useEffect(() => {
    if (selected) setDraft({ name: selected.name, body: selected.body, isDefault: selected.isDefault });
  }, [selected]);

  const preview = useMemo(() => (draft ? buildFromTemplate(draft.body, sampleData(), draft.name.toUpperCase()) : null), [draft]);

  function startNew(body: string, name: string) {
    setSelectedId("new");
    setDraft({ name, body, isDefault: !templates.length });
    setStatus("");
  }

  function insertVariable(key: string) {
    if (!draft) return;
    const area = bodyRef.current;
    const token = `{{${key}}}`;
    const start = area?.selectionStart ?? draft.body.length;
    const end = area?.selectionEnd ?? draft.body.length;
    const body = draft.body.slice(0, start) + token + draft.body.slice(end);
    setDraft({ ...draft, body });
    window.requestAnimationFrame(() => {
      area?.focus();
      area?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function importText(file?: File) {
    if (!file || !draft) return;
    const reader = new FileReader();
    reader.onload = () => setDraft({ ...draft, body: String(reader.result || "") });
    reader.readAsText(file, "utf-8");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave() {
    if (!draft || !draft.name.trim()) {
      setStatus("Dê um nome ao modelo.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const saved =
        selectedId && selectedId !== "new"
          ? await resources.contractTemplates.update(selectedId, draft)
          : await resources.contractTemplates.create(draft);
      await reload();
      setSelectedId(saved._id);
      setStatus("Modelo salvo.");
    } catch (err) {
      setStatus(apiError(err, "Não foi possível salvar o modelo."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!selected || !window.confirm(`Excluir o modelo "${selected.name}"?`)) return;
    await resources.contractTemplates.remove(selected._id);
    setSelectedId(null);
    setDraft(null);
    await reload();
  }

  return (
    <>
      <Head>
        <title>Modelos de contrato | Configurações | Noma</title>
      </Head>
      <SettingsHeader
        title="Modelos de contrato"
        description="Cadastre o contrato que a produtora usa. No Gerador de Contratos, o tipo “Contrato da produtora” preenche as {{variáveis}} com os dados do cliente."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => startNew(systemContractAsTemplate(), "Contrato base (cópia do sistema)")}>
              Copiar contrato do sistema
            </button>
            <button type="button" className="btn-primary" onClick={() => startNew(BLANK_TEMPLATE, "Contrato da produtora")}>
              Novo modelo
            </button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_380px]">
        <nav className="card self-start p-3">
          {isLoading ? <div className="skeleton h-10" /> : null}
          {!isLoading && !templates.length && selectedId !== "new" ? (
            <p className="px-2 py-2 text-sm text-charcoal/55">Nenhum modelo ainda. Crie um novo ou copie o contrato do sistema para editar.</p>
          ) : null}
          {templates.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => setSelectedId(item._id)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                selectedId === item._id ? "bg-tan/10 font-semibold text-tan" : "text-charcoal/70 hover:bg-beige"
              }`}
            >
              <span className="truncate">{item.name}</span>
              {item.isDefault ? <span className="chip bg-gold/10 text-gold">Padrão</span> : null}
            </button>
          ))}
          {selectedId === "new" ? <p className="rounded-lg bg-tan/10 px-3 py-2 text-sm font-semibold text-tan">Novo modelo</p> : null}
        </nav>

        {draft ? (
          <section className="card min-w-0 p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <input className="input-search font-semibold" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <label className="flex items-center gap-2 text-sm font-semibold text-charcoal/70">
                <input type="checkbox" checked={draft.isDefault} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked || draft.isDefault })} />
                Modelo padrão
              </label>
            </div>
            <textarea
              ref={bodyRef}
              className="input-search mt-3 min-h-[520px] resize-y font-mono text-[13px] leading-6"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
            <p className="mt-2 text-xs text-charcoal/50">
              “# ” título · “## ” título de seção · linha em branco separa parágrafos · **negrito**. Local, data e assinaturas entram
              automaticamente no final.
            </p>
            {status ? <p className="mt-2 text-sm font-medium text-charcoal/70">{status}</p> : null}
            <div className="mt-4 flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
                  Importar texto (.txt)
                </button>
                <input ref={fileRef} type="file" accept=".txt,.md" className="hidden" onChange={(e) => importText(e.target.files?.[0])} />
                {selected ? (
                  <button type="button" className="btn-secondary !text-burgundy" onClick={() => void handleDelete()}>
                    Excluir
                  </button>
                ) : null}
              </div>
              <button type="button" className="btn-primary" disabled={busy} onClick={() => void handleSave()}>
                {busy ? "Salvando..." : "Salvar modelo"}
              </button>
            </div>
            <p className="mt-3 rounded-lg bg-beige px-3 py-2 text-xs leading-5 text-charcoal/60">
              Recebeu o contrato em PDF? Abra o arquivo, copie o texto e cole aqui. Depois troque os dados do cliente pelas variáveis ao lado.
            </p>
          </section>
        ) : (
          <section className="card p-6 text-sm text-charcoal/55">Escolha um modelo ou crie um novo.</section>
        )}

        <aside className="space-y-4 self-start xl:sticky xl:top-20">
          <section className="card p-4">
            <p className="mb-2 text-sm font-semibold text-charcoal">Variáveis</p>
            <p className="mb-3 text-xs text-charcoal/50">Clique para inserir no ponto do cursor.</p>
            <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
              {TEMPLATE_VARIABLES.map((group) => (
                <div key={group.group}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-charcoal/40">{group.group}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {group.items.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        title={item.label}
                        disabled={!draft}
                        onClick={() => insertVariable(item.key)}
                        className="rounded-md bg-beige px-2 py-1 font-mono text-[11px] text-charcoal/70 hover:bg-tan/10 hover:text-tan"
                      >
                        {`{{${item.key}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
          {preview ? (
            <div>
              <p className="mb-2 text-xs font-semibold text-charcoal/55">Prévia com dados de exemplo</p>
              <ContractPreview doc={preview} />
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
