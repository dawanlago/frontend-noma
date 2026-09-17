import { FormEvent, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import ClosureModal from "@/components/deals/ClosureModal";
import DossierSummary from "@/components/deals/DossierSummary";
import FormField from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiAssetUrl } from "@/lib/api";
import { resources } from "@/lib/resources";
import { DEAL_SOURCE_LABELS, TASK_STATUS_LABELS, TEMPERATURE_LABELS } from "@/lib/constants";
import { formatCurrencyBRL, formatDateTime, getInitials } from "@/utils/format";
import type { FormInvite, TaskStatus } from "@/types";

const tabs = ["Parecer", "Formulários", "Dossiê", "Arquivos", "Tarefas"] as const;

function answerText(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default function DealDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const dealId = String(router.query.dealId || "");
  const { data: deal, isLoading, error, reload } = useAsyncData(
    () => (dealId ? resources.deals.get(dealId) : Promise.resolve(null)),
    [dealId],
  );
  const { data: users } = useAsyncData(() => resources.users.list());
  const { data: forms } = useAsyncData(() => resources.forms.list());
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Parecer");
  const [noteText, setNoteText] = useState("");
  const [taskForm, setTaskForm] = useState({ title: "", description: "", dueDate: "", status: "todo" });
  const [manualNotes, setManualNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [closureStageId, setClosureStageId] = useState<string | null>(null);
  const [dossierError, setDossierError] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [formSendError, setFormSendError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [financeNotice, setFinanceNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formOptions = (forms || [])
    .filter((form) => form.isActive !== false)
    .map((form) => ({ value: form._id, label: form.name }));
  const selectedFormIdValue = selectedFormId || formOptions[0]?.value || "";
  const selectedFormFilled = Boolean(
    (deal?.formInvites || []).find(
      (invite) => invite.formId === selectedFormIdValue && invite.status === "submitted",
    ),
  );

  async function handleAddNote(event: FormEvent) {
    event.preventDefault();
    if (!noteText.trim()) return;
    setIsSaving(true);
    await resources.deals.addNote(dealId, noteText.trim());
    setNoteText("");
    setIsSaving(false);
    await reload();
  }

  async function handleAddTask(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    await resources.tasks.create({
      dealId,
      title: taskForm.title,
      description: taskForm.description,
      dueDate: taskForm.dueDate,
      status: taskForm.status as TaskStatus,
    });
    setTaskForm({ title: "", description: "", dueDate: "", status: "todo" });
    setIsSaving(false);
    await reload();
  }

  async function handleStageChange(stageId: string) {
    const stage = deal?.funnel?.stages.find((item) => item._id === stageId);
    if (stage?.type === "closure" && !deal?.closedTransactionId) {
      setClosureStageId(stageId);
      return;
    }
    const result = await resources.deals.moveStage(dealId, stageId);
    setFinanceNotice(
      isAdmin && result.meta?.financeRemoved
        ? result.meta.message || "O lançamento no financeiro foi removido."
        : "",
    );
    await reload();
  }

  async function handleAddFileUrl(event: FormEvent) {
    event.preventDefault();
    if (!fileUrl.trim()) return;
    setIsSaving(true);
    await resources.deals.addFile(dealId, { url: fileUrl.trim() });
    setFileUrl("");
    setIsSaving(false);
    await reload();
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsSaving(true);
    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    await resources.deals.addFile(dealId, { fileName: file.name, contentBase64 });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsSaving(false);
    await reload();
  }

  async function handleRemoveFile(fileRef: string) {
    if (!window.confirm("Remover este arquivo?")) return;
    await resources.deals.removeFile(dealId, fileRef);
    await reload();
  }

  async function handleSaveDossier(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    await resources.deals.dossier.update(dealId, { manualNotes });
    setIsSaving(false);
    await reload();
  }

  async function handleGenerateDossier() {
    setIsSaving(true);
    setDossierError("");
    try {
      await resources.deals.dossier.generate(dealId);
      await reload();
    } catch (generateError) {
      setDossierError(
        (generateError as { response?: { data?: { error?: string } } }).response?.data?.error ||
          "Não foi possível gerar o dossiê. Verifique a chave de IA.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleOwnerChange(ownerUserId: string) {
    await resources.deals.update(dealId, { ownerUserId });
    await reload();
  }

  async function handleSendForm(event: FormEvent) {
    event.preventDefault();
    const formId = selectedFormIdValue;
    if (!formId || selectedFormFilled) return;
    setIsSaving(true);
    setFormSendError("");
    try {
      const invite = await resources.deals.sendForm(dealId, formId);
      const url = `${window.location.origin}/formularios/${invite.code}`;
      await navigator.clipboard.writeText(url).catch(() => undefined);
      setCopiedCode(invite.code);
      await reload();
    } catch (sendError) {
      setFormSendError(
        (sendError as { response?: { data?: { error?: string } } }).response?.data?.error ||
          "Não foi possível enviar o formulário.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopyInvite(invite: FormInvite) {
    await navigator.clipboard.writeText(`${window.location.origin}/formularios/${invite.code}`).catch(() => undefined);
    setCopiedCode(invite.code);
  }

  return (
    <>
      <Head><title>Negociação | Noma CRM</title></Head>

      <PageHeader
        eyebrow="Negociação"
        title={deal?.title || "Detalhe da negociação"}
        description={deal ? `${deal.contact?.name || "Contato"} · ${formatCurrencyBRL(deal.value)} · ${TEMPERATURE_LABELS[deal.temperature]}` : "Carregando..."}
      />

      {error ? <p className="mb-4 text-sm text-burgundy">{error}</p> : null}
      {financeNotice ? (
        <p className="mb-4 rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-charcoal">
          {financeNotice}
        </p>
      ) : null}
      {isLoading && !deal ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="h-24 rounded-2xl skeleton" />
            <div className="h-80 rounded-2xl skeleton" />
          </div>
          <div className="space-y-4">
            <div className="h-40 rounded-2xl skeleton" />
            <div className="h-28 rounded-2xl skeleton" />
          </div>
        </div>
      ) : null}

      {deal ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
          <section className="card mb-6 p-5">
            <p className="eyebrow mb-4">Jornada no funil</p>
            <div className="flex flex-wrap gap-2">
              {(deal.funnel?.stages || [])
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((stage) => {
                  const active = deal.currentStageId === stage._id;
                  return (
                    <button
                      key={stage._id}
                      type="button"
                      onClick={() => void handleStageChange(stage._id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        active ? "bg-tan text-white shadow-soft" : "bg-beige text-charcoal/60 hover:bg-tan/10"
                      }`}
                    >
                      {stage.name}
                    </button>
                  );
                })}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center gap-1 overflow-x-auto px-4 pt-3">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === "Dossiê") setManualNotes(deal.dossier?.manualNotes || "");
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab
                      ? "bg-ink text-white"
                      : "text-charcoal/40 hover:bg-beige hover:text-charcoal"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === "Parecer" ? (
                <div>
                  <form onSubmit={handleAddNote} className="mb-6">
                    <FormField label="Novo parecer">
                      <textarea
                        className="input-search min-h-[100px]"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Registre o parecer da negociação..."
                      />
                    </FormField>
                    <button type="submit" className="btn-primary" disabled={isSaving}>Salvar parecer</button>
                  </form>

                  <div className="space-y-4">
                    {(deal.notesDetailed || []).map((note) => (
                      <article key={note._id} className="rounded-xl border border-charcoal/10 bg-beige/40 p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-charcoal/45">
                          <span>{note.stage?.name || "Etapa"}</span>
                          <span>·</span>
                          <span>{formatDateTime(note.date)}</span>
                          <span>·</span>
                          <span>{note.user?.name || "Usuário"}</span>
                        </div>
                        <p className="text-sm leading-6 text-charcoal">{note.text}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeTab === "Formulários" ? (
                <div className="space-y-6">
                  <form onSubmit={(event) => void handleSendForm(event)} className="rounded-xl border border-charcoal/10 bg-beige/40 p-4">
                    <p className="mb-1 text-sm font-semibold text-charcoal">Enviar para este lead</p>
                    <p className="mb-4 text-xs text-charcoal/45">
                      O link usa um código de 6 dígitos ligado a esta negociação. Cada formulário só pode ser preenchido uma vez.
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="min-w-[240px] flex-1">
                        <FormField label="Formulário">
                          <Select
                            value={selectedFormIdValue}
                            onChange={setSelectedFormId}
                            options={formOptions}
                          />
                        </FormField>
                      </div>
                      <button
                        type="submit"
                        className="btn-primary mb-4 h-11"
                        disabled={isSaving || formOptions.length === 0 || selectedFormFilled}
                      >
                        Enviar
                      </button>
                    </div>
                    {selectedFormFilled ? (
                      <p className="text-sm text-charcoal/45">Este formulário já foi preenchido neste lead.</p>
                    ) : null}
                    {formSendError ? <p className="text-sm text-burgundy">{formSendError}</p> : null}
                    {formOptions.length === 0 ? (
                      <p className="text-sm text-charcoal/45">Crie um formulário em Configurações → Formulários.</p>
                    ) : null}
                  </form>

                  {(deal.formInvites || []).length === 0 ? (
                    <p className="text-sm text-charcoal/45">Nenhum formulário enviado nesta negociação.</p>
                  ) : (
                    <div className="space-y-3">
                      {(deal.formInvites || []).map((invite) => {
                        const filled = invite.status === "submitted";
                        return (
                          <article key={invite._id} className="rounded-xl border border-charcoal/10 p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-charcoal">{invite.formName || "Formulário"}</p>
                                <p className="text-xs text-charcoal/45">
                                  Código {invite.code}
                                  {invite.sentAt ? ` · enviado ${formatDateTime(invite.sentAt)}` : ""}
                                  {filled && invite.submittedAt ? ` · preenchido ${formatDateTime(invite.submittedAt)}` : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    filled ? "bg-sage/15 text-sage" : "bg-gold/15 text-gold"
                                  }`}
                                >
                                  {filled ? "Preenchido" : "Pendente"}
                                </span>
                                {!filled ? (
                                  <button
                                    type="button"
                                    className="btn-secondary h-9 px-3 text-xs"
                                    onClick={() => void handleCopyInvite(invite)}
                                  >
                                    {copiedCode === invite.code ? "Link copiado" : "Copiar link"}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            {filled && invite.response?.answers?.length ? (
                              <dl className="space-y-2 border-t border-charcoal/5 pt-3">
                                {invite.response.answers.map((answer) => (
                                  <div key={answer.key} className="grid gap-1 sm:grid-cols-[160px_1fr]">
                                    <dt className="text-xs font-medium text-charcoal/45">{answer.label}</dt>
                                    <dd className="text-sm text-charcoal">{answerText(answer.value)}</dd>
                                  </div>
                                ))}
                              </dl>
                            ) : null}
                            {!filled ? (
                              <p className="truncate text-xs text-charcoal/40">
                                {`${typeof window !== "undefined" ? window.location.origin : ""}/formularios/${invite.code}`}
                              </p>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {activeTab === "Dossiê" ? (
                <div className="space-y-6">
                  <form onSubmit={handleSaveDossier}>
                    <FormField label="Informações manuais" hint="Esses dados originais não são apagados pela IA.">
                      <textarea
                        className="input-search min-h-[140px]"
                        value={manualNotes}
                        onChange={(e) => setManualNotes(e.target.value)}
                        placeholder="Necessidades, contexto da reunião, observações internas..."
                      />
                    </FormField>
                    <button type="submit" className="btn-secondary" disabled={isSaving}>Salvar dossiê</button>
                  </form>

                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-charcoal">Resumo da IA</p>
                      <button type="button" className="btn-primary" disabled={isSaving} onClick={() => void handleGenerateDossier()}>
                        {deal.dossier?.aiSummary ? "Regenerar" : "Gerar com IA"}
                      </button>
                    </div>
                    {deal.dossier?.aiGeneratedAt ? (
                      <p className="mb-2 text-xs text-charcoal/40">
                        Gerado em {formatDateTime(deal.dossier.aiGeneratedAt)}
                        {deal.dossier.aiModel ? ` · ${deal.dossier.aiModel}` : ""}
                      </p>
                    ) : null}
                    {dossierError ? <p className="mb-2 text-sm text-burgundy">{dossierError}</p> : null}
                    {deal.dossier?.aiSummary ? (
                      <DossierSummary text={deal.dossier.aiSummary} />
                    ) : (
                      <div className="rounded-xl bg-beige/50 p-4 text-sm leading-6 text-charcoal/55">
                        Ainda não há resumo gerado. As informações originais continuam abaixo.
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-charcoal">Respostas do formulário</p>
                    {(deal.formResponses || []).length === 0 ? (
                      <p className="text-sm text-charcoal/45">Nenhum formulário respondido nesta negociação.</p>
                    ) : (
                      <div className="space-y-3">
                        {(deal.formResponses || []).map((response) => (
                          <article key={response._id} className="rounded-xl border border-charcoal/10 p-4">
                            <p className="mb-3 text-xs text-charcoal/40">{formatDateTime(response.submittedAt)}</p>
                            <dl className="space-y-2">
                              {response.answers.map((answer) => (
                                <div key={answer.key} className="grid gap-1 sm:grid-cols-[160px_1fr]">
                                  <dt className="text-xs font-medium text-charcoal/45">{answer.label}</dt>
                                  <dd className="text-sm text-charcoal">{answerText(answer.value)}</dd>
                                </div>
                              ))}
                            </dl>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {activeTab === "Arquivos" ? (
                <div>
                  <form onSubmit={handleAddFileUrl} className="mb-4 flex flex-wrap items-end gap-3">
                    <div className="min-w-[280px] flex-1">
                      <FormField label="Link externo">
                        <input
                          className="input-search"
                          value={fileUrl}
                          onChange={(e) => setFileUrl(e.target.value)}
                          placeholder="https://..."
                        />
                      </FormField>
                    </div>
                    <button type="submit" className="btn-primary mb-4 h-11" disabled={isSaving}>Adicionar link</button>
                  </form>

                  <FormField label="Upload de arquivo">
                    <input ref={fileInputRef} type="file" className="input-search" onChange={(e) => void handleFileUpload(e)} disabled={isSaving} />
                  </FormField>

                  <div className="mt-6 space-y-2">
                    {(deal.files || []).length === 0 ? (
                      <p className="text-sm text-charcoal/45">Nenhum arquivo enviado ainda.</p>
                    ) : (
                      deal.files.map((file) => (
                        <div key={file} className="flex items-center justify-between rounded-lg bg-beige/50 px-3 py-2 text-sm">
                          <a href={apiAssetUrl(file)} target="_blank" rel="noreferrer" className="text-tan hover:underline">
                            {file.split("/").pop()}
                          </a>
                          <button type="button" className="text-burgundy" onClick={() => void handleRemoveFile(file)}>
                            Remover
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {activeTab === "Tarefas" ? (
                <div>
                  <form onSubmit={handleAddTask} className="mb-6 grid gap-3 md:grid-cols-2">
                    <FormField label="Título">
                      <input className="input-search" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
                    </FormField>
                    <FormField label="Status">
                      <Select
                        value={taskForm.status}
                        onChange={(status) => setTaskForm({ ...taskForm, status })}
                        options={Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                      />
                    </FormField>
                    <FormField label="Descrição">
                      <input className="input-search" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
                    </FormField>
                    <FormField label="Vencimento">
                      <input className="input-search" type="datetime-local" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} required />
                    </FormField>
                    <div className="md:col-span-2">
                      <button type="submit" className="btn-primary" disabled={isSaving}>Adicionar compromisso</button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {(deal.tasks || []).map((task) => (
                      <article key={task._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-charcoal/10 px-4 py-3">
                        <div>
                          <p className={`font-medium ${task.status === "done" ? "text-charcoal/40 line-through" : "text-charcoal"}`}>{task.title}</p>
                          <p className="text-xs text-charcoal/45">
                            {formatDateTime(task.dueDate)}
                            {task.googleEventId ? " · sincronizado com o Google Agenda" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            className="rounded-lg border border-charcoal/10 bg-white px-2 py-1 text-xs"
                            value={task.status || (task.isCompleted ? "done" : "todo")}
                            onChange={(event) => void resources.tasks.setStatus(task._id, event.target.value).then(reload)}
                          >
                            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
          </div>

          <aside className="space-y-4">
            <article className="card p-5">
              <p className="eyebrow">Resumo</p>
              <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-charcoal">
                {formatCurrencyBRL(deal.value)}
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-charcoal/45">Temperatura</span>
                  <span className="font-medium">{TEMPERATURE_LABELS[deal.temperature]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-charcoal/45">Origem</span>
                  <span className="font-medium">{DEAL_SOURCE_LABELS[deal.source] || deal.source}</span>
                </div>
                {isAdmin && deal.closedTransactionId ? (
                  <p className="rounded-lg bg-sage/10 px-3 py-2 text-xs text-sage">Venda já lançada no financeiro.</p>
                ) : null}
              </div>
            </article>
            <article className="card p-5">
              <p className="eyebrow mb-3">Responsável</p>
              <Select
                value={deal.ownerUserId || ""}
                onChange={(ownerUserId) => void handleOwnerChange(ownerUserId)}
                options={(users || []).map((user) => ({ value: user._id, label: user.name }))}
              />
            </article>
            <article className="card p-5">
              <p className="eyebrow">Contato</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-tan to-[#7a3b22] text-xs font-semibold text-white">
                  {getInitials(deal.contact?.name)}
                </div>
                <div>
                  <p className="font-semibold text-charcoal">{deal.contact?.name || "Contato"}</p>
                  <p className="text-xs text-charcoal/45">{deal.company?.name || "Sem empresa"}</p>
                </div>
              </div>
            </article>
          </aside>
        </div>
      ) : null}

      <ClosureModal
        open={Boolean(closureStageId)}
        dealTitle={deal?.title}
        onClose={() => setClosureStageId(null)}
        onConfirm={async (movementDate) => {
          if (!closureStageId) return;
          await resources.deals.moveStage(dealId, closureStageId, {
            movementDate: new Date(`${movementDate}T12:00:00`).toISOString(),
          });
          await reload();
        }}
      />
    </>
  );
}
