import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  HiOutlineArrowUturnLeft,
  HiOutlineCheckCircle,
  HiOutlineDocumentText,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXCircle,
} from "react-icons/hi2";
import EntityAvatar from "@/components/base/Avatar";
import RelationsCard from "@/components/base/RelationsCard";
import LeadContactLink from "@/components/crm/LeadContactLink";
import LeadForms from "@/components/crm/LeadForms";
import LeadModal from "@/components/crm/LeadModal";
import LeadOwnerField from "@/components/crm/LeadOwnerField";
import { useLostReason } from "@/components/crm/LostReasonDialog";
import SendNpsDialog from "@/components/nps/SendNpsDialog";
import StageChip from "@/components/crm/StageChip";
import { TemperatureBadge } from "@/components/crm/Temperature";
import LeadPayments from "@/components/crm/LeadPayments";
import WonNotice from "@/components/crm/WonNotice";
import { useCustomFieldDisplay } from "@/components/options/CustomFieldsInputs";
import TaskChecklist from "@/components/tasks/TaskChecklist";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LEAD_STATUS_LABELS } from "@/lib/constants";
import { daysSince, formatDays, leadDiscount, eventLabel } from "@/lib/crm/metrics";
import { formToPayload, leadDateOnly, type LeadFormState } from "@/lib/crm/model";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Contact, FinanceEntry, Lead, LeadComment, LeadStatus, Task } from "@/types";
import { formatCurrencyBRL, formatDateOnly, formatDateTime, instagramLink, whatsappLink } from "@/utils/format";
import { confirmDialog } from "@/components/ui/DialogHost";

function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-charcoal">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <dt className="text-charcoal/55">{label}</dt>
      <dd className="text-right font-medium text-charcoal">{value || <span className="text-charcoal/35">—</span>}</dd>
    </div>
  );
}

function Comments({ lead, onChange }: { lead: Lead; onChange: (lead: Lead) => void }) {
  const { isAdmin } = useAuth();
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [error, setError] = useState("");
  const comments = [...(lead.comments || [])].reverse();

  async function run(action: () => Promise<Lead>) {
    setError("");
    try {
      onChange(await action());
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar o parecer."));
    }
  }

  async function remove(comment: LeadComment) {
    if (!(await confirmDialog({ title: "Apagar este parecer?", confirmLabel: "Apagar", danger: true }))) return;
    void run(() => resources.leads.removeComment(lead._id, comment._id));
  }

  return (
    <div>
      <form
        className="mb-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim()) return;
          void run(() => resources.leads.addComment(lead._id, text.trim())).then(() => setText(""));
        }}
      >
        <textarea
          className="input-search min-h-[80px] resize-y"
          value={text}
          placeholder="Registre como está a negociação, o que foi conversado, o próximo passo..."
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <button type="submit" className="btn-primary" disabled={!text.trim()}>
            Registrar parecer
          </button>
        </div>
      </form>
      {error ? <p className="mb-2 text-sm text-burgundy">{error}</p> : null}
      {comments.length === 0 ? <p className="text-sm text-charcoal/50">Nenhum parecer registrado ainda.</p> : null}
      <ol className="space-y-3">
        {comments.map((comment) => (
          <li key={comment._id} className="rounded-lg border border-charcoal/[0.08] p-3">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal/50">
              <span>
                <strong className="text-charcoal/75">{comment.authorName}</strong> · {formatDateTime(comment.createdAt)}
                {comment.editedAt ? ` · editado em ${formatDateTime(comment.editedAt)}` : ""}
              </span>
              {isAdmin ? (
                <span className="flex gap-1">
                  <button
                    type="button"
                    className="btn-ghost h-7 w-7"
                    aria-label="Alterar parecer"
                    onClick={() => setEditing({ id: comment._id, text: comment.text })}
                  >
                    <HiOutlinePencilSquare className="h-4 w-4" />
                  </button>
                  <button type="button" className="btn-ghost h-7 w-7 hover:text-burgundy" aria-label="Apagar parecer" onClick={() => remove(comment)}>
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                </span>
              ) : null}
            </div>
            {editing?.id === comment._id ? (
              <div>
                <textarea
                  className="input-search min-h-[72px] resize-y"
                  value={editing.text}
                  autoFocus
                  onChange={(e) => setEditing({ id: comment._id, text: e.target.value })}
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" className="btn-secondary !py-1.5" onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-primary !py-1.5"
                    disabled={!editing.text.trim()}
                    onClick={() =>
                      void run(() => resources.leads.updateComment(lead._id, comment._id, editing.text.trim())).then(() => setEditing(null))
                    }
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-line text-sm text-charcoal">{comment.text}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function LeadDashboardPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const { can, seesAll } = useAuth();
  const { funnels, labelOf } = useWorkspace();
  const loss = useLostReason();
  const [lead, setLead] = useState<Lead | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [wonLead, setWonLead] = useState<Lead | null>(null);
  const [launchMode, setLaunchMode] = useState<"won" | "launch">("won");
  const [payments, setPayments] = useState<FinanceEntry[]>([]);
  const [npsOpen, setNpsOpen] = useState(false);
  const customDisplay = useCustomFieldDisplay("lead", lead?.custom, lead?.funnelId);

  useEffect(() => {
    if (!id) return;
    setError("");
    resources.leads
      .get(id)
      .then(setLead)
      .catch((err) => setError(apiError(err, "Negociação não encontrada.")));
    resources.tasks
      .list({ leadId: id })
      .then(setTasks)
      .catch(() => setTasks([]));
    if (can("financeiro"))
      resources.finance
        .leadEntries(id)
        .then(setPayments)
        .catch(() => setPayments([]));
    // `can` só muda no login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!lead?.contactId) {
      setContact(null);
      return;
    }
    resources.contacts
      .get(lead.contactId)
      .then(setContact)
      .catch(() => setContact(null));
  }, [lead?.contactId]);

  if (error) {
    return (
      <div className="card p-6">
        <p className="text-sm text-burgundy">{error}</p>
        <Link href="/crm" className="btn-secondary mt-4">
          ← Voltar ao CRM
        </Link>
      </div>
    );
  }
  if (!lead) return <div className="skeleton h-96" />;

  const funnel = funnels.find((item) => item._id === lead.funnelId);
  const stage = funnel?.stages.find((item) => item._id === lead.stageId);
  const subStage = stage?.subStages?.find((item) => item._id === lead.subStageId);
  const discount = leadDiscount(lead);

  async function run(action: () => Promise<Lead>, message = "") {
    setNotice("");
    try {
      const saved = await action();
      setLead(saved);
      if (message) setNotice(message);
      return saved;
    } catch (err) {
      setNotice(apiError(err, "Não foi possível atualizar a negociação."));
      return null;
    }
  }

  async function setStatus(status: LeadStatus) {
    // Perder exige o motivo; cancelar o modal não muda nada.
    const answer = status === "lost" ? await loss.ask(lead!.name) : undefined;
    if (status === "lost" && !answer) return;
    const saved = await run(() => resources.leads.setStatus(lead!._id, status, answer || undefined));
    if (saved && status === "won") {
      setLaunchMode("won");
      setWonLead(saved);
    }
  }

  /** Mover pela barra de etapas: etapa de perda pede o motivo antes. */
  async function moveToStage(stageId: string, kind: LeadStatus) {
    const answer = kind === "lost" && lead!.status !== "lost" ? await loss.ask(lead!.name) : null;
    if (kind === "lost" && lead!.status !== "lost" && !answer) return;
    void run(() => resources.leads.update(lead!._id, { stageId, ...answer }));
  }

  async function handleSave(form: LeadFormState) {
    const payload = formToPayload(form);
    const target = funnels.find((item) => item._id === form.funnelId)?.stages.find((item) => item._id === form.stageId);
    if (target?.kind === "lost" && lead!.status !== "lost") {
      const answer = await loss.ask(lead!.name);
      if (!answer) return;
      Object.assign(payload, answer);
    }
    const saved = await resources.leads.update(lead!._id, payload);
    setLead(saved);
    setEditOpen(false);
  }

  async function handleDelete() {
    await resources.leads.remove(lead!._id);
    void router.push("/crm");
  }

  function openProposal() {
    void router.push(
      `/propostas?cliente=${encodeURIComponent(lead!.contactName || lead!.name)}&empresa=${encodeURIComponent(lead!.company || "")}&valor=${(Number(lead!.value) || 0).toFixed(2)}&negociacao=${lead!._id}`,
    );
  }

  const date = leadDateOnly(lead);

  return (
    <>
      <Head>
        <title>{`${lead.name} | CRM | Noma`}</title>
      </Head>

      <div className="mb-6">
        <Link href="/crm" className="text-sm font-semibold text-tan hover:underline">
          ← CRM Comercial{funnel ? ` · ${funnel.name}` : ""}
        </Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-charcoal">{lead.name}</h1>
            <p className="mt-1 text-sm text-charcoal/60">
              {lead.contactId ? (
                <Link href={`/contatos/${lead.contactId}`} className="font-medium text-tan hover:underline">
                  {lead.contactName}
                </Link>
              ) : null}
              {lead.contactId && lead.companyId ? " · " : ""}
              {lead.companyId ? (
                <Link href={`/empresas/${lead.companyId}`} className="font-medium text-tan hover:underline">
                  {lead.company}
                </Link>
              ) : !lead.companyId && lead.company ? (
                lead.company
              ) : null}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {stage ? <StageChip kind={stage.kind} label={stage.name} /> : null}
              <span className="chip bg-charcoal/[0.06] text-charcoal/65">{LEAD_STATUS_LABELS[lead.status]}</span>
              <TemperatureBadge value={lead.temperature} />
              {lead.status === "lost" && lead.lostReason ? (
                <span className="chip bg-burgundy/10 text-burgundy" title={lead.lostNote || undefined}>
                  Motivo: {labelOf("lostReason", lead.lostReason)}
                </span>
              ) : null}
              {seesAll("crm") && lead.ownerName ? (
                <span className="chip bg-charcoal/[0.06] text-charcoal/60" title="Responsável">
                  {lead.ownerName}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {lead.status === "open" ? (
              <>
                <button type="button" className="btn-primary !bg-sage hover:!bg-sage/90" onClick={() => void setStatus("won")}>
                  <HiOutlineCheckCircle className="h-4 w-4" /> Venda feita
                </button>
                <button type="button" className="btn-secondary" onClick={() => void setStatus("lost")}>
                  <HiOutlineXCircle className="h-4 w-4" /> Perdida
                </button>
              </>
            ) : (
              <button type="button" className="btn-secondary" onClick={() => void setStatus("open")}>
                <HiOutlineArrowUturnLeft className="h-4 w-4" /> Reabrir
              </button>
            )}
            {lead.status === "won" && can("financeiro") ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setLaunchMode("launch");
                  setWonLead(lead);
                }}
              >
                Lançar no financeiro
              </button>
            ) : null}
            {lead.contactId && can("nps", "crm") ? (
              <button type="button" className="btn-secondary" onClick={() => setNpsOpen(true)}>
                Enviar NPS
              </button>
            ) : null}
            {can("propostas") ? (
              <button type="button" className="btn-secondary" onClick={openProposal}>
                <HiOutlineDocumentText className="h-4 w-4" /> Gerar proposta
              </button>
            ) : null}
            <button type="button" className="btn-secondary" onClick={() => setEditOpen(true)}>
              <HiOutlinePencilSquare className="h-4 w-4" /> Editar
            </button>
          </div>
        </div>
      </div>

      {notice ? <p className="mb-4 rounded-lg border border-burgundy/20 bg-burgundy/[0.06] px-4 py-3 text-sm text-burgundy">{notice}</p> : null}

      {funnel ? (
        <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ol className="flex min-w-max gap-1.5">
            {funnel.stages.map((item) => {
              const active = item._id === lead.stageId;
              return (
                <li key={item._id}>
                  <button
                    type="button"
                    disabled={active}
                    onClick={() => void moveToStage(item._id, item.kind)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? item.kind === "won"
                          ? "bg-sage text-white"
                          : item.kind === "lost"
                            ? "bg-burgundy text-white"
                            : "bg-tan text-white"
                        : "bg-beige text-charcoal/60 hover:bg-charcoal/[0.08] hover:text-charcoal"
                    }`}
                  >
                    {item.name}
                  </button>
                </li>
              );
            })}
          </ol>
          {stage?.subStages?.length ? (
            <div className="mt-2 flex min-w-max flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal/40">Microetapa</span>
              {[{ _id: "", name: "Nenhuma" }, ...stage.subStages].map((sub) => {
                const active = (lead.subStageId || "") === sub._id;
                return (
                  <button
                    key={sub._id || "none"}
                    type="button"
                    disabled={active}
                    onClick={() => void run(() => resources.leads.update(lead._id, { subStageId: sub._id }))}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      active ? "bg-tan/15 text-tan ring-1 ring-tan/30" : "bg-beige text-charcoal/55 hover:bg-charcoal/[0.08] hover:text-charcoal"
                    }`}
                  >
                    {sub.name}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Section title="Pareceres">
            <Comments lead={lead} onChange={setLead} />
          </Section>
          <Section title="Formulários">
            <LeadForms lead={lead} phone={contact?.phone} />
          </Section>
          <Section title="Atividades">
            <TaskChecklist tasks={tasks} onChange={setTasks} leadId={lead._id} emptyText="Nenhuma atividade para esta negociação." />
          </Section>
          <Section title="Histórico">
            {lead.history?.length ? (
              <ol className="space-y-2">
                {[...lead.history].reverse().map((item, index) => (
                  <li key={index} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-tan/50" aria-hidden />
                    <span className="text-charcoal/75">
                      {item.text}
                      <span className="block text-xs text-charcoal/45">
                        {formatDateTime(item.at)}
                        {item.userName ? ` · ${item.userName}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-charcoal/50">Sem movimentações registradas.</p>
            )}
          </Section>
        </div>

        <aside className="space-y-6 self-start">
          <Section title="Resumo">
            <p className="text-3xl font-semibold tracking-tight text-charcoal">{formatCurrencyBRL(lead.value || 0)}</p>
            {lead.products.length ? (
              <ul className="mt-3 space-y-1 text-sm">
                {lead.products.map((item, index) => (
                  <li key={index} className="flex justify-between gap-3">
                    <span className="min-w-0 text-charcoal/70">
                      <span className="block truncate">{item.name}</span>
                      {item.description ? <span className="block whitespace-pre-line text-xs text-charcoal/50">{item.description}</span> : null}
                    </span>
                    <span data-money className="shrink-0 tabular-nums text-charcoal">{formatCurrencyBRL(item.price)}</span>
                  </li>
                ))}
                {lead.customValue ? (
                  <li className="flex justify-between gap-3">
                    <span className="text-charcoal/70">Valor avulso</span>
                    <span className="tabular-nums text-charcoal">{formatCurrencyBRL(lead.customValue)}</span>
                  </li>
                ) : null}
              </ul>
            ) : null}
            <dl className="mt-4 divide-y divide-charcoal/[0.06] border-t border-charcoal/[0.06]">
              <Info label="Serviço" value={lead.service ? labelOf("leadService", lead.service) : ""} />
              <Info label="Origem da negociação" value={lead.source ? labelOf("leadSource", lead.source) : ""} />
              <Info label="Próxima ação" value={date ? formatDateOnly(date) : ""} />
              <Info
                label="Responsável"
                value={<LeadOwnerField lead={lead} onChange={(ownerId) => void run(() => resources.leads.update(lead._id, { ownerId }))} />}
              />
              <Info label="Criada por" value={lead.createdByName || lead.ownerName} />
              {lead.eventDate ? (
                <Info
                  label="Data do evento"
                  value={
                    <span className={lead.eventUnavailable ? "text-burgundy" : undefined}>
                      {eventLabel(lead.eventDate).replace(/^Evento /, "")}
                      {lead.eventUnavailable ? " · indisponível" : ""}
                    </span>
                  }
                />
              ) : null}
              <Info label="Criada em" value={formatDateTime(lead.createdAt)} />
              {lead.status === "lost" ? (
                <Info
                  label="Motivo da perda"
                  value={
                    lead.lostReason ? (
                      <>
                        {labelOf("lostReason", lead.lostReason)}
                        {lead.lostNote ? <span className="block text-xs font-normal text-charcoal/55">{lead.lostNote}</span> : null}
                      </>
                    ) : (
                      "Não informado"
                    )
                  }
                />
              ) : null}
              <Info label="Tempo no funil" value={formatDays(daysSince(lead.funnelEnteredAt || lead.createdAt) ?? 0)} />
              <Info label="Na etapa atual" value={formatDays(daysSince(lead.stageEnteredAt || lead.funnelEnteredAt || lead.createdAt) ?? 0)} />
              {subStage ? (
                <Info
                  label={`Na microetapa (${subStage.name})`}
                  value={formatDays(daysSince(lead.subStageEnteredAt || lead.stageEnteredAt || lead.createdAt) ?? 0)}
                />
              ) : null}
              <Info
                label="Último contato"
                value={lead.lastContactAt ? `${formatDateTime(lead.lastContactAt)} (há ${formatDays(daysSince(lead.lastContactAt) ?? 0)})`.replace("(há hoje)", "(hoje)") : "Nenhum registrado"}
              />
              {lead.wonAt ? <Info label="Venda feita em" value={formatDateTime(lead.wonAt)} /> : null}
              {lead.offeredValue ? <Info label="Valor oferecido" value={formatCurrencyBRL(lead.offeredValue)} /> : null}
              {lead.closedValue !== undefined && lead.closedValue !== null ? <Info label="Valor fechado" value={formatCurrencyBRL(lead.closedValue)} /> : null}
              {discount ? (
                <Info label="Desconto" value={`${formatCurrencyBRL(discount.value)} (${(discount.percent * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)`} />
              ) : null}
              {customDisplay.map((item) => (
                <Info key={item.label} label={item.label} value={item.value} />
              ))}
            </dl>
            {lead.notes ? <p className="mt-4 whitespace-pre-line rounded-lg bg-beige px-3 py-2 text-sm text-charcoal/75">{lead.notes}</p> : null}
          </Section>

          {can("financeiro") && (lead.status === "won" || payments.length) ? (
            <Section title="Pagamento">
              <LeadPayments
                entries={payments}
                onChange={setPayments}
                onLaunch={() => {
                  setLaunchMode("launch");
                  setWonLead(lead);
                }}
              />
            </Section>
          ) : null}

          {!lead.contactId && can("crm") ? (
            <Section title="Contato">
              <p className="mb-3 text-sm text-charcoal/50">Esta negociação ainda não tem um contato.</p>
              <LeadContactLink lead={lead} onChange={setLead} variant="button" />
            </Section>
          ) : null}
          {contact ? (
            <Section title="Contato" actions={can("crm") ? <LeadContactLink lead={lead} onChange={setLead} /> : null}>
              <Link href={`/contatos/${contact._id}`} className="flex items-center gap-3">
                <EntityAvatar name={contact.name} image={contact.photo} size={44} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-charcoal">{contact.name}</p>
                  <p className="truncate text-xs text-charcoal/55">{contact.jobRole ? labelOf("jobRole", contact.jobRole) : "Ver perfil"}</p>
                </div>
              </Link>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                {contact.phone ? (
                  <a href={whatsappLink(contact.phone)} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5">
                    WhatsApp
                  </a>
                ) : null}
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="btn-secondary !py-1.5">
                    E-mail
                  </a>
                ) : null}
                {contact.instagram ? (
                  <a href={instagramLink(contact.instagram)} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5">
                    Instagram
                  </a>
                ) : null}
              </div>
            </Section>
          ) : null}
          <RelationsCard kind="lead" id={lead._id} />
        </aside>
      </div>

      <LeadModal
        open={editOpen}
        lead={lead}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        onDelete={() => handleDelete()}
      />
      <WonNotice
        lead={wonLead}
        mode={launchMode}
        onClose={() => setWonLead(null)}
        onLaunched={(saved) => setPayments((current) => [...current, ...saved])}
        onLeadSaved={setLead}
      />
      {loss.dialog}
      <SendNpsDialog open={npsOpen} onClose={() => setNpsOpen(false)} contactId={lead.contactId} leadId={lead._id} />
    </>
  );
}
