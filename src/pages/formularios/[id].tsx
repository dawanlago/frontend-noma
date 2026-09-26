import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineTrash } from "react-icons/hi2";
import CopyButton from "@/components/tools/CopyButton";
import Field from "@/components/tools/Field";
import Select from "@/components/ui/Select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { answerText, draftForm, FORM_FIELD_TARGETS, FORM_FIELD_TYPES, newField, publicFormUrl } from "@/lib/forms";
import { resources } from "@/lib/resources";
import type { CaptureForm, FormField, FormResponse } from "@/types";
import { downloadFile, slugify } from "@/utils/document";
import { formatDateTime } from "@/utils/format";
import { confirmDialog } from "@/components/ui/DialogHost";

type Tab = "builder" | "responses";

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

function Responses({ form }: { form: CaptureForm }) {
  const [responses, setResponses] = useState<FormResponse[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    resources.forms
      .responses(form._id)
      .then(setResponses)
      .catch((err) => setError(apiError(err, "Não foi possível carregar as respostas.")));
  }, [form._id]);

  function exportCsv() {
    if (!responses) return;
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const header = ["Data", ...form.fields.map((field) => field.label)].map(escape).join(";");
    const rows = responses.map((response) =>
      [formatDateTime(response.createdAt), ...form.fields.map((field) => answerText(response.answers[field.key]))].map(escape).join(";"),
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

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-charcoal/[0.06] px-5 py-4">
        <h2 className="text-base font-semibold text-charcoal">{responses.length} respostas</h2>
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
                <tr key={response._id}>
                  <td className="whitespace-nowrap px-4 py-3 text-charcoal/60">{formatDateTime(response.createdAt)}</td>
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
      const payload = {
        ...form,
        fields: form.fields.map((field) => ({ ...field, options: field.options.map((option) => option.trim()).filter(Boolean) })),
      };
      if (isNew) {
        const created = await resources.forms.create({
          name: payload.name,
          description: payload.description,
          isActive: payload.isActive,
          fields: payload.fields,
          successMessage: payload.successMessage,
          createLead: payload.createLead,
          funnelId: payload.funnelId,
          stageId: payload.stageId,
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
              tab === item.value ? "bg-white text-charcoal shadow-soft" : "text-charcoal/55 hover:text-charcoal"
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
