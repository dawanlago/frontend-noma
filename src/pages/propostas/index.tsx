import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import AddRounded from "@mui/icons-material/AddRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import ProposalEditor from "@/components/proposals/ProposalEditor";
import StartFromProposal from "@/components/proposals/StartFromProposal";
import OwnerFilter from "@/components/tools/OwnerFilter";
import SavedDocuments from "@/components/tools/SavedDocuments";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { titleOf, type ProposalData } from "@/lib/proposals/model";
import { applyPrefill, newProposalData, startFromProposal, type ProposalPrefill } from "@/lib/proposals/start";
import { timeAgo } from "@/lib/proposals/views";
import { resources } from "@/lib/resources";
import { confirmDialog } from "@/components/ui/DialogHost";
import type { ToolDocument } from "@/types";
import { formatDate } from "@/utils/format";

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

/** Selos da listagem: aceite do cliente e visualização do link. */
function shareBadges(doc: Omit<ToolDocument, "data">) {
  const share = doc.share;
  if (!share) return null;
  return (
    <>
      {share.acceptedAt ? (
        <span className="chip bg-sage/15 font-semibold text-sage">Aceita em {formatDate(share.acceptedAt)}</span>
      ) : null}
      {share.lastViewedAt ? (
        <span className="chip bg-sage/10 text-sage" title={`${share.viewsCount} ${share.viewsCount === 1 ? "abertura" : "aberturas"} pelo link`}>
          Visto {timeAgo(share.lastViewedAt)}
        </span>
      ) : share.isActive ? (
        <span className="chip bg-charcoal/[0.06] text-charcoal/55">Link criado · não visto</span>
      ) : null}
    </>
  );
}

export default function ProposalsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const id = queryValue(router.query.id);
  const valor = queryValue(router.query.valor);
  const cliente = queryValue(router.query.cliente);
  const empresa = queryValue(router.query.empresa);
  const negociacao = queryValue(router.query.negociacao);
  const leadId = /^[a-f0-9]{24}$/.test(negociacao) ? negociacao : "";
  const hasPrefill = Boolean(valor || cliente || empresa || leadId);

  const [ownerId, setOwnerId] = useState("");
  const [creating, setCreating] = useState(false);
  const [copyingId, setCopyingId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const prefillRef = useRef(false);

  const listEnabled = router.isReady && !id && !hasPrefill;
  const { data: documents, isLoading, reload, setData: setDocuments } = useAsyncData(
    () => (listEnabled ? resources.tools.proposals.list({ ownerId }) : Promise.resolve(null)),
    [listEnabled, ownerId],
  );

  const prefill: ProposalPrefill = { cliente, empresa, valor: parseAmount(valor), leadId };

  async function openCreated(docId: string, replace: boolean) {
    const target = { pathname: router.pathname, query: { id: docId } };
    await (replace ? router.replace(target) : router.push(target));
  }

  /** Nova proposta com os padrões da última (empresa e visual) e os dados recebidos. */
  async function createProposal(extra: ProposalPrefill = {}, replace = false) {
    setCreating(true);
    setError("");
    try {
      const data: ProposalData = applyPrefill(await newProposalData(user?._id), extra);
      const doc = await resources.tools.proposals.create({ title: titleOf(data), data });
      await openCreated(doc._id, replace);
    } catch (err) {
      setError(errorMessage(err, "Não foi possível criar a proposta."));
      if (replace) await router.replace({ pathname: router.pathname });
    } finally {
      setCreating(false);
    }
  }

  async function startFrom(sourceId: string, extra: ProposalPrefill = {}, replace = false) {
    setCopyingId(sourceId);
    setError("");
    try {
      const newId = await startFromProposal(sourceId, extra);
      setPickerOpen(false);
      await openCreated(newId, replace);
    } catch (err) {
      setError(errorMessage(err, "Não foi possível copiar a proposta."));
    } finally {
      setCopyingId("");
    }
  }

  // Da Calculadora de Orçamento (?valor=) ou de link antigo do CRM (?cliente=&empresa=): cria já preenchida.
  // Vindo de uma negociação (?negociacao=) a pessoa escolhe antes: em branco ou a partir de uma anterior.
  useEffect(() => {
    if (!router.isReady || id || !hasPrefill || leadId || prefillRef.current) return;
    prefillRef.current = true;
    void createProposal(prefill, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, id, hasPrefill, leadId]);

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
    if (!(await confirmDialog({ title: "Excluir esta proposta?", message: "Essa ação não pode ser desfeita.", confirmLabel: "Excluir", danger: true }))) return;
    setError("");
    try {
      await resources.tools.proposals.remove(docId);
      setDocuments((current) => (current || []).filter((doc) => doc._id !== docId));
    } catch (err) {
      setError(errorMessage(err, "Não foi possível excluir a proposta."));
    }
  }

  const head = (
    <Head>
      <title>Gerador de Propostas | Noma</title>
    </Head>
  );

  if (id) {
    return (
      <>
        {head}
        <ProposalEditor key={id} id={id} onBack={() => void router.push({ pathname: router.pathname })} onOpen={open} />
      </>
    );
  }

  if (leadId) {
    const who = empresa || cliente;
    return (
      <>
        {head}
        <PageHeader
          eyebrow="Ferramenta comercial"
          title={who ? `Proposta para ${who}` : "Nova proposta"}
          description="Os dados da negociação (cliente e valor) já entram preenchidos, e o aceite do cliente aparece no histórico dela."
          actions={
            <button type="button" className="btn-secondary" onClick={() => router.back()}>
              Voltar
            </button>
          }
        />
        {error ? (
          <p className="mb-4 rounded-xl border border-burgundy/20 bg-burgundy/[0.06] px-4 py-3 text-sm text-burgundy">{error}</p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <section className="card self-start p-5 sm:p-6">
            <h2 className="text-base font-semibold text-charcoal">Começar em branco</h2>
            <p className="mt-1 text-sm text-charcoal/55">
              Sua empresa e a identidade visual vêm da sua última proposta. Só Cliente e Investimento são obrigatórios.
            </p>
            <button type="button" className="btn-primary mt-4" disabled={creating || Boolean(copyingId)} onClick={() => void createProposal(prefill, true)}>
              <AddRounded sx={{ fontSize: 18 }} />
              {creating ? "CRIANDO…" : "CRIAR PROPOSTA"}
            </button>
          </section>
          <section className="card p-5 sm:p-6">
            <h2 className="mb-3 text-base font-semibold text-charcoal">Ou começar de uma proposta anterior</h2>
            <StartFromProposal busyId={copyingId} onPick={(sourceId) => void startFrom(sourceId, prefill, true)} />
          </section>
        </div>
      </>
    );
  }

  if (hasPrefill && !error) {
    return (
      <>
        {head}
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
      {head}
      <PageHeader
        eyebrow="Ferramenta comercial"
        title="Gerador de Propostas"
        description="Crie uma proposta profissional em poucos minutos, sem Canva e sem ajustar layout manualmente."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" disabled={creating} onClick={() => setPickerOpen(true)}>
              <ContentCopyRounded sx={{ fontSize: 17 }} />
              Começar de uma anterior
            </button>
            <button type="button" className="btn-primary" disabled={creating} onClick={() => void createProposal()}>
              <AddRounded sx={{ fontSize: 18 }} />
              {creating ? "CRIANDO…" : "CRIAR NOVA PROPOSTA"}
            </button>
          </div>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl border border-burgundy/20 bg-burgundy/[0.06] px-4 py-3 text-sm text-burgundy">{error}</p>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ["01", "Preencha o essencial", "Cliente e investimento bastam; as outras etapas são opcionais, com prévia ao vivo."],
          ["02", "Escolha o visual", "Cinco layouts prontos, com a sua cor e as suas fontes."],
          ["03", "Envie o link", "Um link que abre no celular — mostra quando o cliente viu e permite aceitar a proposta."],
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
        badge={shareBadges}
        onOpen={open}
        onDuplicate={(docId) => void duplicate(docId)}
        onDelete={(docId) => void remove(docId)}
      />

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Começar de uma proposta anterior"
        description="Escolha uma proposta para copiar. Você só troca o cliente e o que mudar."
        size="lg"
      >
        <StartFromProposal busyId={copyingId} onPick={(sourceId) => void startFrom(sourceId)} />
      </Modal>
    </>
  );
}
