import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import LinkRounded from "@mui/icons-material/LinkRounded";
import SaveStatus from "@/components/tools/SaveStatus";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useToolDocument } from "@/hooks/useToolDocument";
import {
  SIZE_WARNING_BYTES,
  approximateSize,
  normalize,
  titleOf,
  type ProposalData,
} from "@/lib/proposals/model";
import { buildPages, pageIndexForStep } from "@/lib/proposals/pages";
import { proposalFileName, renderProposalHtml } from "@/lib/proposals/render";
import { resources } from "@/lib/resources";
import { missingEssentials } from "@/lib/proposals/start";
import { timeAgo } from "@/lib/proposals/views";
import { formatDate } from "@/utils/format";
import type { ProposalShare, ToolDocument } from "@/types";
import { downloadFile } from "@/utils/document";
import InvestmentStep from "./InvestmentStep";
import PortfolioStep from "./PortfolioStep";
import ProposalPreview from "./ProposalPreview";
import ProposalShareModal from "./ProposalShareModal";
import { ClientStep, CompanyStep, ExperienceStep, ObjectivesStep, StructureStep } from "./StepsIntro";
import { ClosingStep, IdentityStep, PreviewStep } from "./StepsFinal";
import { Callout } from "./ui";
import { alertDialog } from "@/components/ui/DialogHost";

/** Só Cliente e Investimento são essenciais; as demais etapas já vêm com padrões e podem ser puladas. */
const STEPS = [
  { title: "Cliente", description: "Para quem é a proposta e até quando ela vale.", essential: true },
  { title: "Sua empresa", description: "Logo, apresentação e indicadores que geram confiança. Vem da sua última proposta." },
  { title: "Estrutura", description: "Mostre onde e com o que você trabalha." },
  { title: "Clientes/experiência", description: "Um número de destaque sobre sua trajetória." },
  { title: "Objetivo", description: "O que o seu trabalho vai gerar para o cliente." },
  { title: "Portfólio", description: "Vídeos do Google Drive que o cliente assiste direto na proposta." },
  { title: "Investimento", description: "Valor fechado ou pacotes para o cliente escolher.", essential: true },
  { title: "Fechamento", description: "Chamada final e seus contatos." },
  { title: "Identidade visual", description: "Layout, cor e fontes da proposta. Vem da sua última proposta." },
  { title: "Preview", description: "Revise as páginas e baixe o arquivo final.", final: true },
] as { title: string; description: string; essential?: boolean; final?: boolean }[];

/** `resources.tools.proposals` com o tipo do documento (a API genérica devolve `unknown`). */
const proposalApi = {
  get: (docId: string) => resources.tools.proposals.get(docId) as Promise<ToolDocument<ProposalData>>,
  update: (docId: string, payload: { title?: string; data?: ProposalData }) =>
    resources.tools.proposals.update(docId, payload) as Promise<ToolDocument<ProposalData>>,
};

function errorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } }).response?.data?.error || fallback;
}

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

interface ProposalEditorProps {
  id: string;
  onBack: () => void;
  onOpen: (id: string) => void;
}

export default function ProposalEditor({ id, onBack, onOpen }: ProposalEditorProps) {
  const { user } = useAuth();
  const { data, setData, isLoading, error, saveState, ownerName, flush } = useToolDocument<ProposalData>({
    api: proposalApi,
    id,
    normalize,
    titleOf,
  });
  const [step, setStep] = useState(1);
  const [slide, setSlide] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<"" | "duplicate" | "delete">("");
  const [actionError, setActionError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [share, setShare] = useState<ProposalShare | null>(null);
  const formTop = useRef<HTMLDivElement>(null);

  const pages = useMemo(() => (data ? buildPages(data) : []), [data]);
  const size = useMemo(() => (data ? approximateSize(data) : 0), [data]);

  const goToStep = useCallback(
    (next: number, scroll = true) => {
      const target = Math.max(1, Math.min(STEPS.length, next));
      setStep(target);
      if (data) {
        const index = pageIndexForStep(buildPages(data), target);
        if (index !== null) setSlide(index);
      }
      if (scroll && formTop.current && formTop.current.getBoundingClientRect().top < 0) {
        formTop.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [data],
  );

  useEffect(() => {
    setStep(1);
    setSlide(0);
  }, [id]);

  // Resumo das visualizações do link público (selo no topo); falhar aqui não atrapalha a edição.
  useEffect(() => {
    setShare(null);
    resources.tools.proposalShare
      .get(id)
      .then(setShare)
      .catch(() => undefined);
  }, [id]);

  function download() {
    if (!data) return;
    const missing = missingEssentials(data);
    if (missing.length) {
      goToStep(missing[0].step);
      void alertDialog({
        title: "Falta o essencial",
        message: `Para gerar a proposta, preencha: ${missing.map((item) => item.label).join(" e ")}. As outras etapas são opcionais.`,
      });
      return;
    }
    downloadFile(proposalFileName(data), renderProposalHtml(data));
  }

  function openFull() {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([renderProposalHtml(data, { start: slide })], { type: "text/html;charset=utf-8" }));
    const win = window.open(url, "_blank");
    if (!win) void alertDialog({ title: "Pop-up bloqueado", message: "Permita pop-ups para este site no navegador para abrir a proposta em tela cheia." });
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function duplicate() {
    setBusy("duplicate");
    setActionError("");
    try {
      await flush();
      const copy = await resources.tools.proposals.duplicate(id);
      onOpen(copy._id);
    } catch (err) {
      setActionError(errorMessage(err, "Não foi possível duplicar a proposta."));
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    setBusy("delete");
    setActionError("");
    try {
      await resources.tools.proposals.remove(id);
      setConfirmDelete(false);
      onBack();
    } catch (err) {
      setActionError(errorMessage(err, "Não foi possível excluir a proposta."));
    } finally {
      setBusy("");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-24" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
          <div className="skeleton h-[480px]" />
          <div className="skeleton h-72" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-burgundy">{error || "Proposta não encontrada."}</p>
        <button type="button" className="btn-secondary mt-4" onClick={onBack}>
          ← Minhas propostas
        </button>
      </div>
    );
  }

  const current = STEPS[step - 1];
  const missing = missingEssentials(data);
  const missingSteps = new Set(missing.map((item) => item.step));
  const stepProps = { data, setData };
  const showOwner = user?.role === "admin" && ownerName && ownerName !== user.name;
  const shareBadge = share?.stats.lastViewedAt
    ? `Visto ${timeAgo(share.stats.lastViewedAt)} · ${share.stats.views} ${share.stats.views === 1 ? "abertura" : "aberturas"}`
    : share?.link?.isActive
      ? "Link criado · ainda não visto"
      : "";
  const acceptedBadge = share?.accepted ? `Aceita em ${formatDate(share.accepted.at)} por ${share.accepted.name}` : "";

  return (
    <>
      <PageHeader
        eyebrow="Ferramenta comercial"
        title="Gerador de Propostas"
        description={`Editando: ${titleOf(data)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary" onClick={onBack}>
              <ArrowBackRounded sx={{ fontSize: 18 }} />
              Minhas propostas
            </button>
            <SaveStatus state={saveState} />
            <button type="button" className="btn-secondary" onClick={() => void flush()}>
              Salvar
            </button>
            <button type="button" className="btn-secondary" disabled={busy === "duplicate"} onClick={() => void duplicate()}>
              {busy === "duplicate" ? "Duplicando…" : "Duplicar"}
            </button>
            <button type="button" className="btn-secondary !text-burgundy" onClick={() => setConfirmDelete(true)}>
              Excluir
            </button>
            <button type="button" className="btn-secondary" onClick={() => goToStep(STEPS.length)}>
              Pré-visualizar
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShareOpen(true)}>
              <LinkRounded sx={{ fontSize: 18 }} />
              Link para o cliente
            </button>
            <button type="button" className="btn-primary" onClick={download}>
              <DownloadRounded sx={{ fontSize: 18 }} />
              GERAR PROPOSTA
            </button>
          </div>
        }
      />

      <div className="mb-4 space-y-3">
        {showOwner || shareBadge || acceptedBadge || data.leadId ? (
          <div className="flex flex-wrap gap-2">
            {showOwner ? <span className="chip bg-gold/10 text-gold">Documento de {ownerName}</span> : null}
            {data.leadId ? (
              <Link href={`/crm/${data.leadId}`} className="chip bg-tan/10 text-tan hover:bg-tan/15">
                Ver negociação
              </Link>
            ) : null}
            {acceptedBadge ? (
              <button type="button" className="chip bg-sage/15 font-semibold text-sage hover:bg-sage/20" onClick={() => setShareOpen(true)}>
                {acceptedBadge}
              </button>
            ) : null}
            {shareBadge ? (
              <button type="button" className="chip bg-sage/10 text-sage hover:bg-sage/15" onClick={() => setShareOpen(true)}>
                {shareBadge}
              </button>
            ) : null}
          </div>
        ) : null}
        {actionError ? <Callout tone="warning">{actionError}</Callout> : null}
        {size > SIZE_WARNING_BYTES ? (
          <Callout tone="warning">
            Esta proposta está com {formatSize(size)} por causa das imagens. Arquivos acima de ~3,5 MB podem falhar ao salvar ou
            demorar para abrir no celular — remova algumas fotos da estrutura ou use imagens menores.
          </Callout>
        ) : null}
      </div>

      <nav ref={formTop} aria-label="Etapas da proposta" className="-mx-1 mb-5 scroll-mt-20 overflow-x-auto px-1 pb-1">
        <ol className="flex min-w-max gap-1.5">
          {STEPS.map((item, index) => {
            const n = index + 1;
            const active = n === step;
            return (
              <li key={item.title}>
                <button
                  type="button"
                  aria-current={active ? "step" : undefined}
                  onClick={() => goToStep(n, false)}
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${
                    active
                      ? "border-tan bg-tan text-white shadow-sm"
                      : n < step
                        ? "border-tan/20 bg-tan/[0.06] text-tan hover:bg-tan/10"
                        : "border-charcoal/10 bg-surface text-charcoal/60 hover:border-charcoal/25 hover:text-charcoal"
                  }`}
                >
                  <span className={`tabular-nums ${active ? "text-white/70" : "opacity-60"}`}>{String(n).padStart(2, "0")}</span>
                  {item.title}
                  {item.essential ? (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${missingSteps.has(n) ? "bg-gold" : active ? "bg-white" : "bg-sage"}`}
                      title={missingSteps.has(n) ? "Essencial: falta preencher" : "Essencial: preenchido"}
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 px-1 text-xs text-charcoal/50">
          Pule para qualquer etapa. Só <strong className="font-semibold text-charcoal/70">Cliente</strong> e{" "}
          <strong className="font-semibold text-charcoal/70">Investimento</strong> são essenciais
          {missing.length ? ` — falta: ${missing.map((item) => item.label).join(" e ")}.` : " — prontos, já dá para gerar."}
        </p>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] 2xl:grid-cols-[minmax(0,1fr)_560px]">
        <div className="min-w-0 space-y-4">
          <section className="card p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-charcoal/[0.08] pb-4">
              <div>
                <p className="eyebrow">
                  Etapa {String(step).padStart(2, "0")} de {STEPS.length}
                </p>
                <h2 className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold text-charcoal">
                  {current.title}
                  {current.essential ? (
                    <span className="chip bg-tan/10 text-tan">Essencial</span>
                  ) : current.final ? null : (
                    <span className="chip bg-charcoal/[0.06] text-charcoal/55">Opcional</span>
                  )}
                </h2>
                <p className="mt-0.5 text-sm text-charcoal/55">{current.description}</p>
              </div>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-charcoal/[0.08]" aria-hidden>
                <div className="h-full rounded-full bg-tan transition-all" style={{ width: `${(step / STEPS.length) * 100}%` }} />
              </div>
            </div>

            {step === 1 ? <ClientStep {...stepProps} /> : null}
            {step === 2 ? <CompanyStep {...stepProps} /> : null}
            {step === 3 ? <StructureStep {...stepProps} /> : null}
            {step === 4 ? <ExperienceStep {...stepProps} /> : null}
            {step === 5 ? <ObjectivesStep {...stepProps} /> : null}
            {step === 6 ? <PortfolioStep {...stepProps} /> : null}
            {step === 7 ? <InvestmentStep {...stepProps} /> : null}
            {step === 8 ? <ClosingStep {...stepProps} /> : null}
            {step === 9 ? <IdentityStep {...stepProps} /> : null}
            {step === 10 ? (
              <PreviewStep {...stepProps} pages={pages} onGoToSlide={setSlide} onDownload={download} onOpenFull={openFull} />
            ) : null}
          </section>

          <div className="flex items-center justify-between gap-3">
            <button type="button" className="btn-secondary" disabled={step === 1} onClick={() => goToStep(step - 1)}>
              ← Anterior
            </button>
            {step < STEPS.length ? (
              <button type="button" className="btn-primary" onClick={() => goToStep(step + 1)}>
                Próxima: {STEPS[step].title} →
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={download}>
                <DownloadRounded sx={{ fontSize: 18 }} />
                BAIXAR PROPOSTA HTML
              </button>
            )}
          </div>
        </div>

        <aside className="self-start lg:sticky lg:top-20">
          <ProposalPreview data={data} pages={pages} slide={slide} onSlideChange={setSlide} onOpenFull={openFull} />
          <p className="mt-2 px-1 text-xs text-charcoal/45">
            Clique numa etapa para ir à página correspondente. Na prévia, as setas do teclado também funcionam.
          </p>
        </aside>
      </div>

      <ProposalShareModal
        id={id}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onChange={setShare}
        beforeCreate={flush}
      />

      <Modal
        open={confirmDelete}
        title="Excluir proposta?"
        description={`"${titleOf(data)}" será removida. Essa ação não pode ser desfeita.`}
        onClose={() => setConfirmDelete(false)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-danger" disabled={busy === "delete"} onClick={() => void remove()}>
              {busy === "delete" ? "Excluindo…" : "Excluir"}
            </button>
          </>
        }
      >
        <span />
      </Modal>
    </>
  );
}
