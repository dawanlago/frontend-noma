import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import AddRounded from "@mui/icons-material/AddRounded";
import ProposalEditor from "@/components/proposals/ProposalEditor";
import OwnerFilter from "@/components/tools/OwnerFilter";
import SavedDocuments from "@/components/tools/SavedDocuments";
import PageHeader from "@/components/ui/PageHeader";
import { useAsyncData } from "@/hooks/useAsyncData";
import { defaultData, moneyText, titleOf, type ProposalData } from "@/lib/proposals/model";
import { resources } from "@/lib/resources";

function queryValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value || "").trim();
}

/** Aceita "4233.60", "4233,60" ou "4.233,60". */
function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const value = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function errorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } }).response?.data?.error || fallback;
}

export default function ProposalsPage() {
  const router = useRouter();
  const id = queryValue(router.query.id);
  const valor = queryValue(router.query.valor);
  const cliente = queryValue(router.query.cliente);
  const empresa = queryValue(router.query.empresa);
  const hasPrefill = Boolean(valor || cliente || empresa);

  const [ownerId, setOwnerId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const prefillRef = useRef(false);

  const listEnabled = router.isReady && !id && !hasPrefill;
  const { data: documents, isLoading, reload, setData: setDocuments } = useAsyncData(
    () => (listEnabled ? resources.tools.proposals.list({ ownerId }) : Promise.resolve(null)),
    [listEnabled, ownerId],
  );

  async function createProposal(data: ProposalData, replace = false) {
    setCreating(true);
    setError("");
    try {
      const doc = await resources.tools.proposals.create({ title: titleOf(data), data });
      const target = { pathname: router.pathname, query: { id: doc._id } };
      await (replace ? router.replace(target) : router.push(target));
    } catch (err) {
      setError(errorMessage(err, "Não foi possível criar a proposta."));
      if (replace) await router.replace({ pathname: router.pathname });
    } finally {
      setCreating(false);
    }
  }

  // Vindo da Calculadora de Orçamento (?valor=) ou do CRM (?cliente=&empresa=): cria já preenchida.
  useEffect(() => {
    if (!router.isReady || id || !hasPrefill || prefillRef.current) return;
    prefillRef.current = true;
    const data = defaultData();
    const amount = parseAmount(valor);
    if (amount !== null) data.investment.single.value = moneyText(amount);
    if (cliente) data.client.name = cliente;
    if (empresa) data.client.company = empresa;
    void createProposal(data, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, id, hasPrefill, valor, cliente, empresa]);

  function open(docId: string) {
    void router.push({ pathname: router.pathname, query: { id: docId } });
  }

  async function duplicate(docId: string) {
    setError("");
    try {
      await resources.tools.proposals.duplicate(docId);
      await reload();
    } catch (err) {
      setError(errorMessage(err, "Não foi possível duplicar a proposta."));
    }
  }

  async function remove(docId: string) {
    if (!window.confirm("Excluir esta proposta? Essa ação não pode ser desfeita.")) return;
    setError("");
    try {
      await resources.tools.proposals.remove(docId);
      setDocuments((current) => (current || []).filter((doc) => doc._id !== docId));
    } catch (err) {
      setError(errorMessage(err, "Não foi possível excluir a proposta."));
    }
  }

  if (id) {
    return (
      <>
        <Head>
          <title>Gerador de Propostas | Noma CRM</title>
        </Head>
        <ProposalEditor
          key={id}
          id={id}
          onBack={() => void router.push({ pathname: router.pathname })}
          onOpen={open}
        />
      </>
    );
  }

  if (hasPrefill && !error) {
    return (
      <>
        <Head>
          <title>Gerador de Propostas | Noma CRM</title>
        </Head>
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-tan/20 border-t-tan" />
          <p className="text-sm font-semibold text-charcoal">Preparando sua proposta…</p>
          <p className="text-xs text-charcoal/50">Os dados recebidos já vão aparecer preenchidos.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Gerador de Propostas | Noma CRM</title>
      </Head>
      <PageHeader
        eyebrow="Ferramenta comercial"
        title="Gerador de Propostas"
        description="Crie uma proposta profissional em poucos minutos, sem Canva e sem ajustar layout manualmente."
        actions={
          <button type="button" className="btn-primary" disabled={creating} onClick={() => void createProposal(defaultData())}>
            <AddRounded sx={{ fontSize: 18 }} />
            {creating ? "CRIANDO…" : "CRIAR NOVA PROPOSTA"}
          </button>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl border border-burgundy/20 bg-burgundy/[0.06] px-4 py-3 text-sm text-burgundy">{error}</p>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ["01", "Preencha as etapas", "Cliente, empresa, portfólio e investimento — com prévia ao vivo."],
          ["02", "Escolha o visual", "Cinco layouts prontos, com a sua cor e as suas fontes."],
          ["03", "Envie o arquivo", "Um HTML leve que abre no celular, com os vídeos do Drive."],
        ].map(([n, title, text]) => (
          <div key={n} className="card-muted p-4">
            <span className="eyebrow">{n}</span>
            <p className="mt-1 text-sm font-semibold text-charcoal">{title}</p>
            <p className="mt-0.5 text-[13px] leading-5 text-charcoal/55">{text}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex justify-end">
        <OwnerFilter value={ownerId} onChange={setOwnerId} />
      </div>

      <SavedDocuments
        title="Suas propostas salvas"
        documents={documents}
        isLoading={isLoading || !router.isReady}
        emptyMessage="Nenhuma proposta ainda. Clique em “Criar nova proposta” para começar."
        subtitle={(doc) => {
          const data = (doc as { data?: Partial<ProposalData> }).data;
          return data?.client?.title || "Proposta Comercial";
        }}
        onOpen={open}
        onDuplicate={(docId) => void duplicate(docId)}
        onDelete={(docId) => void remove(docId)}
      />
    </>
  );
}
