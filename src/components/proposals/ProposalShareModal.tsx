import { useCallback, useEffect, useState } from "react";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import DevicesRounded from "@mui/icons-material/DevicesRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import { confirmDialog } from "@/components/ui/DialogHost";
import Modal from "@/components/ui/Modal";
import { apiError } from "@/lib/errors";
import { deviceLabel, formatDuration, proposalLinkUrl, timeAgo } from "@/lib/proposals/views";
import { resources } from "@/lib/resources";
import type { ProposalShare } from "@/types";
import { copyText } from "@/utils/document";
import { formatDateTime } from "@/utils/format";

interface ProposalShareModalProps {
  id: string;
  open: boolean;
  onClose: () => void;
  /** Avisa quem abriu o modal (ex.: para atualizar o selo de visualizações). */
  onChange?: (share: ProposalShare) => void;
  /** Salva as alterações pendentes antes de gerar o link. */
  beforeCreate?: () => Promise<unknown>;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-muted p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/45">{label}</p>
      <p className="mt-1 text-base font-semibold text-charcoal">{value}</p>
      {hint ? <p className="text-xs text-charcoal/45">{hint}</p> : null}
    </div>
  );
}

/** "Link para o cliente": cria/copia/desativa o link público e mostra as visualizações. */
export default function ProposalShareModal({ id, open, onClose, onChange, beforeCreate }: ProposalShareModalProps) {
  const [share, setShare] = useState<ProposalShare | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const apply = useCallback(
    (next: ProposalShare) => {
      setShare(next);
      onChange?.(next);
    },
    [onChange],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      apply(await resources.tools.proposalShare.get(id));
    } catch (err) {
      setError(apiError(err, "Não foi possível carregar o link da proposta."));
    } finally {
      setIsLoading(false);
    }
  }, [id, apply]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function run(action: () => Promise<ProposalShare>, fallback: string) {
    setBusy(true);
    setError("");
    try {
      apply(await action());
    } catch (err) {
      setError(apiError(err, fallback));
    } finally {
      setBusy(false);
    }
  }

  async function createLink(regenerate = false) {
    if (
      regenerate &&
      !(await confirmDialog({
        title: "Gerar um novo link?",
        message: "O link atual deixa de funcionar. O histórico de visualizações é mantido.",
        confirmLabel: "Gerar novo link",
      }))
    )
      return;
    await run(async () => {
      await beforeCreate?.();
      return resources.tools.proposalShare.create(id, regenerate);
    }, "Não foi possível criar o link.");
  }

  async function disableLink() {
    if (
      !(await confirmDialog({
        title: "Desativar o link?",
        message: "O cliente não vai mais conseguir abrir a proposta por ele. Você pode reativar depois.",
        confirmLabel: "Desativar",
        danger: true,
      }))
    )
      return;
    await run(() => resources.tools.proposalShare.disable(id), "Não foi possível desativar o link.");
  }

  async function copy(url: string) {
    await copyText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const link = share?.link;
  const url = link ? proposalLinkUrl(link.token) : "";
  const stats = share?.stats;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Link para o cliente"
      description="Envie o link em vez do arquivo e acompanhe quando e por quanto tempo o cliente abriu a proposta."
    >
      <div className="space-y-6">
        {error ? (
          <p className="rounded-xl border border-burgundy/20 bg-burgundy/[0.06] px-4 py-3 text-sm text-burgundy">{error}</p>
        ) : null}

        <section>
          {!share && isLoading ? (
            <div className="skeleton h-20" />
          ) : link?.isActive ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={url}
                  aria-label="Link da proposta"
                  className="input-search min-w-0 flex-1 font-mono !text-[13px]"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <div className="flex gap-2">
                  <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={() => void copy(url)}>
                    <ContentCopyRounded sx={{ fontSize: 17 }} />
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary" title="Abrir o link">
                    <OpenInNewRounded sx={{ fontSize: 17 }} />
                  </a>
                </div>
              </div>
              <p className="text-xs text-charcoal/50">
                O link mostra sempre a versão salva mais recente. Criado em {formatDateTime(link.createdAt)}.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="text-sm font-semibold text-tan" disabled={busy} onClick={() => void createLink(true)}>
                  Gerar novo link
                </button>
                <button type="button" className="text-sm font-semibold text-burgundy" disabled={busy} onClick={() => void disableLink()}>
                  Desativar link
                </button>
              </div>
            </div>
          ) : (
            <div className="card-muted flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-charcoal/65">
                {link ? "O link desta proposta está desativado: o cliente não consegue abri-lo." : "Esta proposta ainda não tem link."}
              </p>
              <button type="button" className="btn-primary" disabled={busy} onClick={() => void createLink(false)}>
                {busy ? "Aguarde…" : link ? "Reativar link" : "Criar link"}
              </button>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-charcoal">Visualizações</h3>
            <button type="button" className="btn-ghost !h-8 !w-8" title="Atualizar" aria-label="Atualizar" onClick={() => void load()}>
              <RefreshRounded sx={{ fontSize: 18 }} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Aberturas" value={String(stats?.views || 0)} />
            <Stat label="Tempo total" value={formatDuration(stats?.totalSeconds || 0)} />
            <Stat
              label="Primeira"
              value={stats?.firstViewedAt ? timeAgo(stats.firstViewedAt) : "—"}
              hint={stats?.firstViewedAt ? formatDateTime(stats.firstViewedAt) : undefined}
            />
            <Stat
              label="Última"
              value={stats?.lastViewedAt ? timeAgo(stats.lastViewedAt) : "—"}
              hint={stats?.lastViewedAt ? formatDateTime(stats.lastViewedAt) : undefined}
            />
          </div>

          {share?.sessions.length ? (
            <ul className="mt-4 divide-y divide-charcoal/[0.08] rounded-xl border border-charcoal/[0.08]">
              {share.sessions.map((session) => (
                <li key={session._id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal">{formatDateTime(session.openedAt)}</p>
                    <p className="flex items-center gap-1 text-xs text-charcoal/50">
                      <DevicesRounded sx={{ fontSize: 14 }} />
                      {deviceLabel(session)}
                    </p>
                  </div>
                  <span className="chip bg-tan/10 text-tan">{formatDuration(session.durationSeconds)} aberta</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-charcoal/55">
              {link ? "O cliente ainda não abriu a proposta." : "Crie o link e envie ao cliente para acompanhar as visualizações."}
            </p>
          )}
          <p className="mt-3 text-xs text-charcoal/45">
            O tempo conta só enquanto a proposta está na tela do cliente. Aberturas feitas por quem está logado no Noma não
            entram na contagem.
          </p>
        </section>
      </div>
    </Modal>
  );
}
