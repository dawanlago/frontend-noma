import { Fragment, useEffect, useMemo, useState } from "react";
import { useAsyncData } from "@/hooks/useAsyncData";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineTrash } from "react-icons/hi2";
import LogoUpload from "@/components/contracts/LogoUpload";
import CopyButton from "@/components/tools/CopyButton";
import Field from "@/components/tools/Field";
import Select from "@/components/ui/Select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { answerText, draftForm, FORM_FIELD_TARGETS, FORM_FIELD_TYPES, formatDateKey, newField, publicFormUrl } from "@/lib/forms";
import { resources } from "@/lib/resources";
import type { CaptureForm, FormAvailability, FormField, FormResponse } from "@/types";
import { normalizeHex } from "@/theme/appearance";
import { downloadFile, slugify } from "@/utils/document";
import { formatDateTime } from "@/utils/format";
import { confirmDialog } from "@/components/ui/DialogHost";

type Tab = "builder" | "responses";

const EMPTY_AVAILABILITY: FormAvailability = { minNoticeDays: 0, blockedDates: [], message: "" };

function FieldRow({
  field,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  field: FormField;
  index: number;
  total: number;
  onChange: (field: FormField) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const hasOptions = field.type === "select" || field.type === "multiselect";
  return (
    <li className="rounded-xl border border-charcoal/[0.08] p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <input className="input-search font-semibold" value={field.label} placeholder="Pergunta" onChange={(e) => onChange({ ...field, label: e.target.value })} />
        <Select value={field.type} onChange={(type) => onChange({ ...field, type: type as FormField["type"] })} options={FORM_FIELD_TYPES} />
      </div>
      {hasOptions ? (
        <textarea
          className="input-search mt-3 min-h-[72px] resize-y"
          value={field.options.join("\n")}
          placeholder="Uma opção por linha"
          onChange={(e) => onChange({ ...field, options: e.target.value.split("\n") })}
        />
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-center">
        <input
          className="input-search"
          value={field.placeholder}
          placeholder="Texto de ajuda (opcional)"
          onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
        />
        <Select value={field.target} onChange={(target) => onChange({ ...field, target: target as FormField["target"] })} options={FORM_FIELD_TARGETS} />
        <div className="flex items-center justify-end gap-1">
          <label className="mr-2 flex items-center gap-1.5 text-xs font-semibold text-charcoal/65">
            <input type="checkbox" checked={field.required} onChange={(e) => onChange({ ...field, required: e.target.checked })} />
            Obrigatório
          </label>
          <button type="button" className="btn-ghost h-8 w-8" aria-label="Subir" disabled={index === 0} onClick={() => onMove(-1)}>
            <HiOutlineArrowUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="btn-ghost h-8 w-8" aria-label="Descer" disabled={index === total - 1} onClick={() => onMove(1)}>
            <HiOutlineArrowDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="btn-ghost h-8 w-8 hover:text-burgundy" aria-label="Remover pergunta" onClick={onRemove}>
            <HiOutlineTrash className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

/** "Completa" ou "Incompleto · parou na pergunta X" (+ data do evento). */
function statusText(form: CaptureForm, response: FormResponse) {
  const event = response.eventDate ? ` · evento ${formatDateKey(response.eventDate)}` : "";
  if (response.status !== "partial") return `Completa${event}`;
  return `Incompleto · parou na pergunta ${Math.min((response.lastStep || 0) + 1, form.fields.length)}${event}`;
}

/** Regra da pergunta "Data do evento": antecedência mínima, datas bloqueadas e o aviso. */
function AvailabilitySettings({ value, onChange }: { value: FormAvailability; onChange: (value: FormAvailability) => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  function addRange() {
    if (!from) return;
    const end = to && to >= from ? to : from;
    onChange({ ...value, blockedDates: [...value.blockedDates, { from, to: end }] });
    setFrom("");
    setTo("");
  }
  return (
    <section className="card space-y-4 p-5">
      <div>
        <p className="text-sm font-semibold text-charcoal">Disponibilidade da data do evento</p>
        <p className="mt-0.5 text-xs text-charcoal/55">
          Vale para a pergunta do tipo “Data do evento”. Quem escolher uma data fora da regra vê o aviso, mas ainda pode enviar; a resposta e a negociação ficam marcadas como “data indisponível”.
        </p>
      </div>
      <Field label="Antecedência mínima (dias)" hint="Ex.: 15 = não atendemos com menos de 15 dias. 0 = sem limite.">
        <input
          type="number"
          min={0}
          className="input-search"
          value={value.minNoticeDays || ""}
          placeholder="0"
          onChange={(e) => onChange({ ...value, minNoticeDays: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
        />
      </Field>
      <Field label="Datas bloqueadas" group>
        <div className="space-y-2">
          {value.blockedDates.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {value.blockedDates.map((range, index) => (
                <li key={`${range.from}-${index}`} className="chip bg-charcoal/[0.06] text-charcoal/70">
                  {range.from === range.to ? formatDateKey(range.from) : `${formatDateKey(range.from)} a ${formatDateKey(range.to)}`}
                  <button
                    type="button"
                    className="hover:text-burgundy"
                    aria-label="Remover data bloqueada"
                    onClick={() => onChange({ ...value, blockedDates: value.blockedDates.filter((_, i) => i !== index) })}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
            <input type="date" className="input-search !px-2" aria-label="De" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" className="input-search !px-2" aria-label="Até (opcional)" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            <button type="button" className="btn-secondary !px-3 !py-2" disabled={!from} onClick={addRange}>
              Bloquear
            </button>
          </div>
          <p className="text-xs text-charcoal/50">Um dia só: preencha apenas o primeiro campo.</p>
        </div>
      </Field>
      <Field label="Aviso de indisponibilidade" hint="Em branco = texto padrão.">
        <textarea
          className="input-search min-h-[64px] resize-y"
          value={value.message}
          placeholder="Infelizmente não temos disponibilidade para essa data..."
          onChange={(e) => onChange({ ...value, message: e.target.value })}
        />
      </Field>
    </section>
  );
}

function Responses({ form }: { form: CaptureForm }) {
  const [responses, setResponses] = useState<FormResponse[] | null>(null);
  const [error, setError] = useState("");
  const [openHistory, setOpenHistory] = useState("");

  useEffect(() => {
    resources.forms
      .responses(form._id)
      .then(setResponses)
      .catch((err) => setError(apiError(err, "Não foi possível carregar as respostas.")));
  }, [form._id]);

  function exportCsv() {
    if (!responses) return;
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const header = ["Data", "Situação", ...form.fields.map((field) => field.label)].map(escape).join(";");
    const rows = responses.map((response) =>
      [formatDateTime(response.createdAt), statusText(form, response), ...form.fields.map((field) => answerText(response.answers[field.key]))]
        .map(escape)
        .join(";"),
    );
    downloadFile(`${slugify(form.name, "formulario")}-respostas.csv`, `﻿${[header, ...rows].join("\n")}`, "text/csv;charset=utf-8");
  }

  async function remove(response: FormResponse) {
    if (!(await confirmDialog({ title: "Excluir esta resposta?", message: "O contato e a negociação criados continuam na base.", confirmLabel: "Excluir", danger: true }))) return;
    await resources.forms.removeResponse(form._id, response._id);
    setResponses((current) => (current || []).filter((item) => item._id !== response._id));
  }

  if (error) return <p className="text-sm text-burgundy">{error}</p>;
  if (!responses) return <div className="skeleton h-40" />;
  const partialCount = responses.filter((response) => response.status === "partial").length;
  const completeCount = responses.length - partialCount;
  const labelOf = (key: string) => form.fields.find((field) => field.key === key)?.label || key;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-charcoal/[0.06] px-5 py-4">
        <h2 className="text-base font-semibold text-charcoal">
          {completeCount} {completeCount === 1 ? "resposta" : "respostas"}
          {partialCount ? <span className="ml-2 text-sm font-medium text-charcoal/50">· {partialCount} incompleta(s)</span> : null}
        </h2>
        <button type="button" className="btn-secondary !py-1.5" disabled={!responses.length} onClick={exportCsv}>
          Exportar planilha (CSV)
        </button>
      </div>
      {responses.length === 0 ? (
        <p className="px-5 py-8 text-sm text-charcoal/50">Nenhuma resposta ainda. Compartilhe o link do formulário.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table min-w-[720px] text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Situação</th>
                {form.fields.map((field) => (
                  <th key={field.key} className="px-4 py-3 text-left">
                    {field.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-left">Negociação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {responses.map((response) => (
                <Fragment key={response._id}>
                <tr>
                  <td className="whitespace-nowrap px-4 py-3 text-charcoal/60">{formatDateTime(response.updatedAt || response.createdAt)}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col items-start gap-1">
                      <span
                        className={`chip ${response.status === "partial" ? "bg-gold/15 text-charcoal/75" : "bg-tan/10 text-tan"}`}
                        title={response.status === "partial" ? `Parou em: ${form.fields[response.lastStep || 0]?.label || ""}` : undefined}
                      >
                        {statusText(form, response)}
                      </span>
                      {response.unavailable ? <span className="chip bg-burgundy/10 text-burgundy">Data indisponível</span> : null}
                      {response.events?.length ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-tan hover:underline"
                          onClick={() => setOpenHistory((current) => (current === response._id ? "" : response._id))}
                        >
                          {openHistory === response._id ? "Ocultar histórico" : `Histórico (${response.events.length})`}
                        </button>
                      ) : null}
                    </div>
                  </td>
                  {form.fields.map((field) => (
                    <td key={field.key} className="max-w-[260px] px-4 py-3 align-top">
                      <span className="line-clamp-3 whitespace-pre-line">{answerText(response.answers[field.key]) || "—"}</span>
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    {response.leadId ? (
                      <Link href={`/crm/${response.leadId}`} className="font-semibold text-tan hover:underline">
                        Abrir
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="btn-ghost h-8 w-8 hover:text-burgundy" aria-label="Excluir resposta" onClick={() => void remove(response)}>
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
                {openHistory === response._id ? (
                  <tr>
                    <td colSpan={form.fields.length + 4} className="bg-beige/60 px-4 py-3">
                      <p className="mb-2 text-xs font-semibold text-charcoal/60">Histórico do preenchimento</p>
                      <ol className="space-y-1 text-xs text-charcoal/75">
                        {(response.events || []).map((event, index) => (
                          <li key={index} className="flex gap-3">
                            <span className="w-[120px] shrink-0 text-charcoal/50">{formatDateTime(event.at)}</span>
                            <span className="font-semibold">{labelOf(event.fieldKey)}:</span>
                            <span className="min-w-0 break-words">{event.value || "(apagou a resposta)"}</span>
                          </li>
                        ))}
                      </ol>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function FormEditorPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  /** /formularios/novo: rascunho que ainda não existe no servidor. */
  const isNew = id === "novo";
  const { funnels } = useWorkspace();
  const [form, setForm] = useState<CaptureForm | null>(null);
  const schedulingLinks = useAsyncData(() => resources.scheduling.links().catch(() => []));
  const [tab, setTab] = useState<Tab>("builder");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (router.query.aba === "respostas") setTab("responses");
  }, [router.query.aba]);

  useEffect(() => {
    if (!id) return;
    if (isNew) {
      setForm(draftForm());
      setDirty(true);
      return;
    }
    resources.forms
      .get(id)
      .then(setForm)
      .catch((err) => setStatus(apiError(err, "Formulário não encontrado.")));
  }, [id, isNew]);

  const funnel = useMemo(() => funnels.find((item) => item._id === form?.funnelId) || funnels[0], [funnels, form?.funnelId]);

  if (!form) return status ? <p className="card p-6 text-sm text-burgundy">{status}</p> : <div className="skeleton h-96" />;

  const update = (changes: Partial<CaptureForm>) => {
    setForm({ ...form, ...changes });
    setDirty(true);
  };
  const setField = (index: number, field: FormField) => update({ fields: form.fields.map((item, i) => (i === index ? field : item)) });
  const moveField = (index: number, delta: number) => {
    const fields = [...form.fields];
    const target = index + delta;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    update({ fields });
  };

  async function handleSave() {
    if (!form) return;
    setIsSaving(true);
    setStatus("");
    try {
      const accentColor = form.accentColor?.trim() ? normalizeHex(form.accentColor) : "";
      if (form.accentColor?.trim() && !accentColor) {
        setStatus("Cor inválida: use o formato #RRGGBB (ex.: #C8102E).");
        return;
      }
      const payload = {
        ...form,
        accentColor,
        fields: form.fields.map((field) => ({ ...field, options: field.options.map((option) => option.trim()).filter(Boolean) })),
      };
      if (isNew) {
        const created = await resources.forms.create({
          name: payload.name,
          description: payload.description,
          isActive: payload.isActive,
          fields: payload.fields,
          successMessage: payload.successMessage,
          schedulingLinkId: payload.schedulingLinkId,
          logo: payload.logo,
          accentColor: payload.accentColor,
          createLead: payload.createLead,
          funnelId: payload.funnelId,
          stageId: payload.stageId,
          availability: payload.availability,
        });
        setDirty(false);
        // Agora existe: troca a URL para a do formulário salvo.
        void router.replace(`/formularios/${created._id}`);
        return;
      }
      const saved = await resources.forms.update(form._id, payload);
      setForm(saved);
      setDirty(false);
      setStatus("Formulário salvo.");
    } catch (err) {
      setStatus(apiError(err, "Não foi possível salvar."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (isNew) {
      void router.push("/formularios");
      return;
    }
    if (!form || !(await confirmDialog({ title: `Excluir o formulário "${form.name}"?`, message: "Todas as respostas dele também serão excluídas.", confirmLabel: "Excluir", danger: true }))) return;
    await resources.forms.remove(form._id);
    void router.push("/formularios");
  }

  const url = isNew ? "" : publicFormUrl(form.publicId);

  return (
    <>
      <Head>
        <title>{`${form.name} | Formulários | Noma`}</title>
      </Head>
      <Link href="/formularios" className="text-sm font-semibold text-tan hover:underline">
        ← Formulários
      </Link>
      <div className="mb-5 mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-charcoal">{form.name}</h1>
        <div className="flex flex-wrap gap-2">
          {isNew ? (
            <Link href="/formularios" className="btn-secondary">
              Cancelar
            </Link>
          ) : (
            <>
              <CopyButton text={url} label="Copiar link" className="btn-secondary" />
              <a href={url} target="_blank" rel="noreferrer" className="btn-secondary">
                Abrir formulário
              </a>
            </>
          )}
          <button type="button" className="btn-primary" disabled={isSaving || !dirty} onClick={() => void handleSave()}>
            {isSaving ? "Salvando..." : isNew ? "Salvar formulário" : dirty ? "Salvar alterações" : "Salvo"}
          </button>
        </div>
      </div>
      {status ? <p className="mb-4 text-sm font-medium text-charcoal/70">{status}</p> : null}
      {isNew ? (
        <p className="mb-4 rounded-lg border border-gold/30 bg-gold/[0.07] px-4 py-3 text-sm text-charcoal/75">
          Rascunho: o formulário só é criado quando você clicar em “Salvar formulário”.
        </p>
      ) : null}

      <div className="mb-5 inline-flex gap-1 rounded-xl bg-beige p-1">
        {(
          [
            { value: "builder", label: "Perguntas e configurações" },
            { value: "responses", label: "Respostas" },
          ] as { value: Tab; label: string }[]
        )
          .filter((item) => !isNew || item.value === "builder")
          .map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === item.value ? "bg-surface text-charcoal shadow-soft" : "text-charcoal/55 hover:text-charcoal"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "responses" ? (
        <Responses form={form} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="card p-5 sm:p-6">
            <div className="grid gap-4">
              <Field label="Nome do formulário">
                <input className="input-search" value={form.name} onChange={(e) => update({ name: e.target.value })} />
              </Field>
              <Field label="Descrição (aparece no topo)">
                <textarea className="input-search min-h-[72px] resize-y" value={form.description} onChange={(e) => update({ description: e.target.value })} />
              </Field>
            </div>
            <h2 className="mb-3 mt-6 text-base font-semibold text-charcoal">Perguntas</h2>
            <ol className="space-y-3">
              {form.fields.map((field, index) => (
                <FieldRow
                  key={index}
                  field={field}
                  index={index}
                  total={form.fields.length}
                  onChange={(next) => setField(index, next)}
                  onMove={(delta) => moveField(index, delta)}
                  onRemove={() => update({ fields: form.fields.filter((_, i) => i !== index) })}
                />
              ))}
            </ol>
            <button type="button" className="btn-secondary mt-3" onClick={() => update({ fields: [...form.fields, newField()] })}>
              + Adicionar pergunta
            </button>
          </section>

          <aside className="space-y-4 self-start lg:sticky lg:top-20">
            <section className="card space-y-4 p-5">
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" checked={form.isActive} onChange={(e) => update({ isActive: e.target.checked })} />
                <span>
                  <span className="block text-sm font-semibold text-charcoal">Formulário ativo</span>
                  <span className="block text-xs text-charcoal/55">Pausado, o link deixa de aceitar respostas.</span>
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" checked={form.createLead} onChange={(e) => update({ createLead: e.target.checked })} />
                <span>
                  <span className="block text-sm font-semibold text-charcoal">Criar contato e negociação</span>
                  <span className="block text-xs text-charcoal/55">
                    Usa as perguntas marcadas como “Nome/E-mail/Telefone do contato” para cadastrar na base.
                  </span>
                </span>
              </label>
              {form.createLead ? (
                <div className="grid gap-3">
                  <Field label="Funil">
                    <Select
                      value={funnel?._id || ""}
                      onChange={(funnelId) => update({ funnelId, stageId: "" })}
                      options={funnels.map((item) => ({ value: item._id, label: item.name }))}
                    />
                  </Field>
                  <Field label="Etapa inicial">
                    <Select
                      value={form.stageId || ""}
                      onChange={(stageId) => update({ stageId })}
                      placeholder="Primeira etapa do funil"
                      options={[{ value: "", label: "Primeira etapa do funil" }, ...(funnel?.stages || []).map((stage) => ({ value: stage._id, label: stage.name }))]}
                    />
                  </Field>
                </div>
              ) : null}
              <Field label="Mensagem depois do envio">
                <textarea className="input-search min-h-[64px] resize-y" value={form.successMessage} onChange={(e) => update({ successMessage: e.target.value })} />
              </Field>
            </section>
            {form.fields.some((field) => field.type === "eventDate") ? (
              <AvailabilitySettings value={form.availability || EMPTY_AVAILABILITY} onChange={(availability) => update({ availability })} />
            ) : null}
            <section className="card space-y-3 p-5">
              <p className="text-sm font-semibold text-charcoal">Agendar reunião no fim</p>
              <Select
                value={form.schedulingLinkId || ""}
                onChange={(schedulingLinkId) => update({ schedulingLinkId })}
                options={[
                  { value: "", label: "Não oferecer agendamento" },
                  ...(schedulingLinks.data || []).filter((link) => link.isActive).map((link) => ({ value: link._id, label: `${link.title} · ${link.durationMinutes} min` })),
                ]}
              />
              <p className="text-xs text-charcoal/50">
                Depois de enviar, a pessoa vê o botão “Agendar a reunião” com os horários livres da sua agenda (já com nome, e-mail e telefone). Crie os links em Agenda → Agendamento externo.
              </p>
            </section>
            <section className="card space-y-4 p-5">
              <p className="text-sm font-semibold text-charcoal">Aparência do link</p>
              <Field label="Logo" hint="Sem logo, usa a de Configurações → Geral." group>
                <LogoUpload folder="marca" value={form.logo || ""} onChange={(logo) => update({ logo })} />
              </Field>
              <Field label="Cor" hint="Botões, barra de progresso e destaques. Em branco = cor padrão da marca.">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Seletor de cor"
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-charcoal/15 bg-surface p-1"
                    value={normalizeHex(form.accentColor || "") || "#c8102e"}
                    onChange={(e) => update({ accentColor: e.target.value })}
                  />
                  <input
                    className="input-search font-mono uppercase"
                    value={form.accentColor || ""}
                    maxLength={7}
                    placeholder="#C8102E"
                    aria-label="Cor em hexadecimal"
                    onChange={(e) => update({ accentColor: e.target.value })}
                  />
                  {form.accentColor ? (
                    <button type="button" className="shrink-0 text-xs font-semibold text-tan hover:underline" onClick={() => update({ accentColor: "" })}>
                      Padrão
                    </button>
                  ) : null}
                </div>
              </Field>
            </section>
            <section className="card p-5">
              <p className="mb-1 text-xs font-semibold text-charcoal/60">Link público</p>
              <p className="break-all rounded-lg bg-beige px-3 py-2 text-xs text-charcoal/70">
                {url || "O link é gerado quando o formulário for salvo."}
              </p>
            </section>
            {!isNew ? (
              <button type="button" className="w-full text-center text-sm font-semibold text-burgundy hover:underline" onClick={() => void handleDelete()}>
                Excluir formulário
              </button>
            ) : null}
          </aside>
        </div>
      )}
    </>
  );
}
