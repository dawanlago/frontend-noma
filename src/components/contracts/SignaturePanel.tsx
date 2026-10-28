import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Field from "@/components/tools/Field";
import ToolSection from "@/components/tools/ToolSection";
import { alertDialog, confirmDialog } from "@/components/ui/DialogHost";
import { useAuth } from "@/contexts/AuthContext";
import type { ContractDocument } from "@/lib/contracts/clauses";
import { partyRoles, type ContractData } from "@/lib/contracts/model";
import {
  ACTIVE_STATUSES,
  SIGNATURE_STATUS_LABELS,
  base64Size,
  contractPdfBase64,
  signatureApi,
  type ContractSignatureInfo,
  type SignatureIntegrationState,
  type SignatureStatus,
  type SignerInput,
} from "@/lib/contracts/signature";
import { apiError } from "@/lib/errors";
import { slugify } from "@/utils/document";

interface SignaturePanelProps {
  documentId: string;
  data: ContractData;
  doc: ContractDocument;
  title: string;
  accent: string;
  step?: number;
  /** Salva as alterações pendentes antes de gerar o PDF. */
  flush: () => Promise<void>;
}

/** Limite do PDF enviado (o corpo da requisição na Vercel não passa de ~4,5 MB). */
const MAX_PDF_BYTES = 3 * 1024 * 1024;

const STATUS_STYLE: Record<SignatureStatus, string> = {
  processing: "bg-gold/10 text-gold",
  pending: "bg-gold/10 text-gold",
  finishing: "bg-tan/10 text-tan",
  signed: "bg-sage/10 text-sage",
  rejected: "bg-burgundy/10 text-burgundy",
  expired: "bg-charcoal/10 text-charcoal/60",
  failed: "bg-burgundy/10 text-burgundy",
  cancelled: "bg-charcoal/10 text-charcoal/60",
};

const SIGNER_LABELS = { pending: "Aguardando", signed: "Assinou", rejected: "Recusou" } as const;

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Signatários iniciais: as partes do contrato, na ordem em que aparecem nele. */
function signersFromContract(data: ContractData): SignerInput[] {
  const roles = partyRoles(data.type);
  const parties = [
    { party: data.other, role: roles.other },
    { party: data.me, role: roles.me },
  ];
  return parties.map(({ party, role }) => ({
    name: party.name.trim(),
    email: party.email.trim(),
    governmentId: party.document.trim(),
    role,
  }));
}

const emptySigner = (): SignerInput => ({ name: "", email: "", governmentId: "", role: "TESTEMUNHA" });

export default function SignaturePanel({ documentId, data, doc, title, accent, step, flush }: SignaturePanelProps) {
  const { can } = useAuth();
  const [integration, setIntegration] = useState<SignatureIntegrationState | null>(null);
  const [signature, setSignature] = useState<ContractSignatureInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [signers, setSigners] = useState<SignerInput[] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"" | "send" | "refresh" | "cancel" | "download">("");

  const load = useCallback(async () => {
    try {
      const result = await signatureApi.get(documentId);
      setIntegration(result.integration);
      setSignature(result.signature);
      setLoadError("");
    } catch (err) {
      setLoadError(apiError(err, "Não foi possível carregar a assinatura eletrônica."));
    }
  }, [documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Enquanto a Assinafy processa o PDF, consulta de novo sozinho algumas vezes.
  const status = signature?.status;
  useEffect(() => {
    if (status !== "processing" && status !== "finishing") return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (attempts > 6) {
        window.clearInterval(timer);
        return;
      }
      signatureApi
        .refresh(documentId)
        .then(setSignature)
        .catch(() => window.clearInterval(timer));
    }, 10000);
    return () => window.clearInterval(timer);
  }, [status, documentId]);

  // Signatários pré-preenchidos com as partes até a pessoa editar a lista.
  const suggested = useMemo(() => signersFromContract(data), [data]);
  const list = signers || suggested;
  const editSigner = (index: number, value: Partial<SignerInput>) =>
    setSigners(list.map((signer, position) => (position === index ? { ...signer, ...value } : signer)));

  async function handleSend() {
    const filled = list.map((signer) => ({ ...signer, name: signer.name.trim(), email: signer.email.trim() }));
    const missing = filled.find((signer) => !signer.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer.email));
    if (missing) {
      void alertDialog({
        title: "Confira os signatários",
        message: `Preencha nome e e-mail válidos para ${missing.name || missing.role || "todos os signatários"}.`,
      });
      return;
    }
    const ok = await confirmDialog({
      title: "Enviar para assinatura?",
      message: `A Assinafy vai mandar o contrato por e-mail para ${filled.map((signer) => signer.name).join(", ")}. Alterações feitas depois do envio não entram no documento enviado.`,
      confirmLabel: "Enviar",
    });
    if (!ok) return;
    setBusy("send");
    try {
      await flush();
      const pdf = await contractPdfBase64(doc, { logo: data.logo, accent, title });
      if (base64Size(pdf) > MAX_PDF_BYTES) {
        void alertDialog({ title: "PDF muito grande", message: "O PDF passou de 3 MB. Use um logo menor e tente de novo." });
        return;
      }
      const result = await signatureApi.send(documentId, {
        pdf,
        fileName: slugify(title, "contrato"),
        signers: filled,
        message: message.trim() || undefined,
      });
      setSignature(result);
      setSigners(null);
    } catch (err) {
      void alertDialog({ title: "Não foi possível enviar", message: apiError(err, "Tente de novo em instantes.") });
    } finally {
      setBusy("");
    }
  }

  async function handleRefresh() {
    setBusy("refresh");
    try {
      setSignature(await signatureApi.refresh(documentId));
    } catch (err) {
      void alertDialog({ title: "Não foi possível atualizar", message: apiError(err, "Tente de novo em instantes.") });
    } finally {
      setBusy("");
    }
  }

  async function handleCancel() {
    const active = signature && ACTIVE_STATUSES.includes(signature.status);
    const ok = await confirmDialog({
      title: active ? "Cancelar o envio?" : "Descartar este envio?",
      message: active
        ? "O documento será excluído na Assinafy e os links de assinatura deixam de funcionar."
        : "O histórico deste envio sai da tela e você poderá enviar o contrato de novo.",
      confirmLabel: active ? "Cancelar envio" : "Descartar",
      danger: true,
    });
    if (!ok) return;
    setBusy("cancel");
    try {
      setSignature(await signatureApi.cancel(documentId));
    } catch (err) {
      void alertDialog({ title: "Não foi possível cancelar", message: apiError(err, "Tente de novo em instantes.") });
    } finally {
      setBusy("");
    }
  }

  async function handleDownload() {
    setBusy("download");
    try {
      await signatureApi.download(documentId, `${slugify(title, "contrato")}-assinado.pdf`);
    } catch (err) {
      void alertDialog({ title: "Não foi possível baixar", message: apiError(err, "Tente de novo em instantes.") });
    } finally {
      setBusy("");
    }
  }

  const section = (children: ReactNode) => (
    <ToolSection
      step={step}
      title="Assinatura eletrônica"
      description="Envie o contrato para as partes assinarem pela Assinafy e acompanhe aqui quem já assinou."
    >
      {children}
    </ToolSection>
  );

  if (loadError) return section(<p className="text-sm text-burgundy">{loadError}</p>);
  if (!integration) return section(<div className="skeleton h-24" />);

  if (!integration.configured || !integration.enabled) {
    return section(
      <div className="rounded-xl border border-gold/30 bg-gold/[0.07] px-4 py-3 text-sm text-charcoal">
        <p className="font-semibold">
          {integration.configured ? "A integração com a Assinafy está desativada." : "A assinatura eletrônica ainda não está configurada."}
        </p>
        <p className="mt-1 text-charcoal/65">
          {can("configuracoes") ? (
            <>
              Cadastre a chave de API e o ID da conta da Assinafy em{" "}
              <Link href="/configuracoes/integracoes" className="font-semibold text-tan hover:underline">
                Configurações → Integrações
              </Link>
              .
            </>
          ) : (
            "Peça a um administrador para configurar a Assinafy em Configurações → Integrações."
          )}
        </p>
      </div>,
    );
  }

  const showForm = !signature || ["cancelled", "rejected", "expired", "failed"].includes(signature.status);
  const isActive = signature ? ACTIVE_STATUSES.includes(signature.status) : false;

  return section(
    <div className="space-y-4">
      {integration.environment === "sandbox" ? (
        <p className="rounded-lg bg-beige px-3.5 py-2.5 text-xs leading-5 text-charcoal/60">
          Ambiente de testes (sandbox): as assinaturas não têm validade jurídica.
        </p>
      ) : null}

      {signature && signature.status !== "cancelled" ? (
        <div className="rounded-xl border border-charcoal/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className={`chip ${STATUS_STYLE[signature.status]}`}>{SIGNATURE_STATUS_LABELS[signature.status]}</span>
              <p className="mt-1.5 text-xs text-charcoal/50">
                {signature.sentAt ? `Enviado em ${formatDate(signature.sentAt)}` : `Criado em ${formatDate(signature.createdAt)}`}
                {signature.completedAt ? ` · concluído em ${formatDate(signature.completedAt)}` : ""}
                {signature.lastSyncedAt ? ` · atualizado em ${formatDate(signature.lastSyncedAt)}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {signature.hasSignedFile ? (
                <button type="button" className="btn-primary" disabled={Boolean(busy)} onClick={() => void handleDownload()}>
                  {busy === "download" ? "Baixando…" : "Baixar PDF assinado"}
                </button>
              ) : null}
              <button type="button" className="btn-secondary" disabled={Boolean(busy)} onClick={() => void handleRefresh()}>
                {busy === "refresh" ? "Atualizando…" : "Atualizar"}
              </button>
              {signature.status !== "signed" ? (
                <button type="button" className="btn-secondary !text-burgundy" disabled={Boolean(busy)} onClick={() => void handleCancel()}>
                  {isActive ? "Cancelar envio" : "Descartar"}
                </button>
              ) : null}
            </div>
          </div>
          {signature.error ? <p className="mt-3 text-sm text-burgundy">{signature.error}</p> : null}
          {signature.status === "processing" && !signature.error ? (
            <p className="mt-3 text-xs text-charcoal/55">
              A Assinafy está processando o PDF. Os convites saem assim que ele estiver pronto.
            </p>
          ) : null}
          <ul className="mt-4 divide-y divide-charcoal/10">
            {signature.signers.map((signer) => (
              <li key={signer.email} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-charcoal">
                    {signer.name}
                    {signer.role ? <span className="ml-2 text-xs font-normal text-charcoal/50">{signer.role}</span> : null}
                  </p>
                  <p className="truncate text-xs text-charcoal/55">{signer.email}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`chip ${
                      signer.status === "signed"
                        ? "bg-sage/10 text-sage"
                        : signer.status === "rejected"
                          ? "bg-burgundy/10 text-burgundy"
                          : "bg-gold/10 text-gold"
                    }`}
                  >
                    {SIGNER_LABELS[signer.status]}
                  </span>
                  <p className="mt-1 text-[11px] text-charcoal/50">
                    {signer.status === "signed" && signer.signedAt
                      ? formatDate(signer.signedAt)
                      : signer.status === "rejected" && signer.rejectedAt
                        ? formatDate(signer.rejectedAt)
                        : signer.viewedAt
                          ? `Visualizou em ${formatDate(signer.viewedAt)}`
                          : ""}
                  </p>
                  {signer.status === "pending" && signer.signingUrl ? (
                    <a href={signer.signingUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-tan hover:underline">
                      Link de assinatura
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showForm ? (
        <div className="space-y-3">
          {signature && signature.status !== "cancelled" ? (
            <p className="text-sm font-semibold text-charcoal">Enviar de novo</p>
          ) : null}
          {list.map((signer, index) => (
            <div key={index} className="rounded-xl border border-charcoal/10 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <input
                  className="w-40 bg-transparent text-xs font-semibold uppercase tracking-wide text-charcoal/60 outline-none"
                  value={signer.role}
                  aria-label="Papel do signatário"
                  onChange={(event) => editSigner(index, { role: event.target.value })}
                />
                {list.length > 1 ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-charcoal/50 hover:text-burgundy"
                    onClick={() => setSigners(list.filter((_, position) => position !== index))}
                  >
                    Remover
                  </button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome completo">
                  <input className="input-search" value={signer.name} onChange={(event) => editSigner(index, { name: event.target.value })} />
                </Field>
                <Field label="E-mail">
                  <input
                    className="input-search"
                    type="email"
                    value={signer.email}
                    onChange={(event) => editSigner(index, { email: event.target.value })}
                  />
                </Field>
                <Field label="CPF/CNPJ (opcional)">
                  <input
                    className="input-search"
                    value={signer.governmentId}
                    onChange={(event) => editSigner(index, { governmentId: event.target.value })}
                  />
                </Field>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-semibold text-tan hover:underline"
            onClick={() => setSigners([...list, emptySigner()])}
          >
            + Adicionar signatário
          </button>
          <Field label="Mensagem no convite (opcional)">
            <textarea
              className="input-search resize-y"
              rows={2}
              value={message}
              placeholder="Ex.: Segue o contrato combinado para assinatura."
              onChange={(event) => setMessage(event.target.value)}
            />
          </Field>
          <button type="button" className="btn-primary w-full" disabled={Boolean(busy)} onClick={() => void handleSend()}>
            {busy === "send" ? "Enviando…" : "Enviar para assinatura"}
          </button>
        </div>
      ) : null}
    </div>,
  );
}
