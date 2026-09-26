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
import LeadForms from "@/components/crm/LeadForms";
import LeadModal from "@/components/crm/LeadModal";
import SendNpsDialog from "@/components/nps/SendNpsDialog";
import StageChip from "@/components/crm/StageChip";
import { TemperatureBadge } from "@/components/crm/Temperature";
import WonNotice from "@/components/crm/WonNotice";
import { useCustomFieldDisplay } from "@/components/options/CustomFieldsInputs";
import TaskChecklist from "@/components/tasks/TaskChecklist";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LEAD_STATUS_LABELS } from "@/lib/constants";
import { formToPayload, leadDateOnly, type LeadFormState } from "@/lib/crm/model";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Contact, Lead, LeadComment, LeadStatus, Task } from "@/types";
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
  const { isAdmin, can } = useAuth();
  const { funnels, labelOf } = useWorkspace();
  const [lead, setLead] = useState<Lead | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [wonLead, setWonLead] = useState<Lead | null>(null);
  const [npsOpen, setNpsOpen] = useState(false);
  const customDisplay = useCustomFieldDisplay("lead", lead?.custom);

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
    const saved = await run(() => resources.leads.setStatus(lead!._id, status));
    if (saved && status === "won") setWonLead(saved);
  }

  async function handleSave(form: LeadFormState) {
    const saved = await resources.leads.update(lead!._id, formToPayload(form));
    setLead(saved);
    setEditOpen(false);
  }

  async function handleDelete() {
    await resources.leads.remove(lead!._id);
    void router.push("/crm");
  }

  function openProposal() {
    void router.push(
      `/propostas?cliente=${encodeURIComponent(lead!.contactName || lead!.name)}&empresa=${encodeURIComponent(lead!.company || "")}&valor=${(Number(lead!.value) || 0).toFixed(2)}`,
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
              {isAdmin && lead.ownerName ? <span className="chip bg-charcoal/[0.06] text-charcoal/60">{lead.ownerName}</span> : null}
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
              <Link href={`/financeiro?negociacao=${lead._id}`} className="btn-secondary">
                Lançar no financeiro
              </Link>
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
                    onClick={() => void run(() => resources.leads.update(lead._id, { stageId: item._id }))}
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
                    <span className="truncate text-charcoal/70">{item.name}</span>
                    <span className="tabular-nums text-charcoal">{formatCurrencyBRL(item.price)}</span>
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
              <Info label="Origem" value={lead.source ? labelOf("leadSource", lead.source) : ""} />
              <Info label="Próxima ação" value={date ? formatDateOnly(date) : ""} />
              <Info label="Criada em" value={formatDateTime(lead.createdAt)} />
              {lead.wonAt ? <Info label="Venda feita em" value={formatDateTime(lead.wonAt)} /> : null}
              {customDisplay.map((item) => (
                <Info key={item.label} label={item.label} value={item.value} />
              ))}
            </dl>
            {lead.notes ? <p className="mt-4 whitespace-pre-line rounded-lg bg-beige px-3 py-2 text-sm text-charcoal/75">{lead.notes}</p> : null}
          </Section>

          {contact ? (
            <Section title="Contato">
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
        </aside>
      </div>

      <LeadModal
        open={editOpen}
        lead={lead}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        onDelete={() => handleDelete()}
      />
      <WonNotice lead={wonLead} onClose={() => setWonLead(null)} />
      <SendNpsDialog open={npsOpen} onClose={() => setNpsOpen(false)} contactId={lead.contactId} leadId={lead._id} />
    </>
  );
}
