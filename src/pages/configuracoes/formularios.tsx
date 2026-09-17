import { FormEvent, useMemo, useState } from "react";
import Head from "next/head";
import FormField from "@/components/ui/FormField";
import ListWorkspace from "@/components/ui/ListWorkspace";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import { FORM_FIELD_TYPE_LABELS, FORM_FIELD_TYPES } from "@/lib/constants";
import type { Form, FormField as FormFieldConfig, FormFieldType } from "@/types";

const emptyField = (): FormFieldConfig => ({
  key: "",
  label: "",
  type: "text",
  required: false,
  options: [],
  order: 0,
});

function publicFormUrl(id: string) {
  if (typeof window === "undefined") return `/formularios/${id}`;
  return `${window.location.origin}/formularios/${id}`;
}

export default function SettingsFormsPage() {
  const { data: forms, isLoading, error, reload } = useAsyncData(() => resources.forms.list());
  const { data: funnels } = useAsyncData(() => resources.funnels.list());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Form | null>(null);
  const [form, setForm] = useState({
    name: "",
    funnelId: "",
    isActive: true,
    fields: [
      { ...emptyField(), label: "Nome", key: "nome", required: true, type: "text" as FormFieldType },
      { ...emptyField(), label: "E-mail", key: "email", required: true, type: "email" as FormFieldType },
      { ...emptyField(), label: "Telefone", key: "telefone", required: true, type: "phone" as FormFieldType },
    ] as FormFieldConfig[],
  });

  const funnelOptions = useMemo(
    () => (funnels || []).map((funnel) => ({ value: funnel._id, label: funnel.name })),
    [funnels],
  );

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      funnelId: funnels?.[0]?._id || "",
      isActive: true,
      fields: [
        { ...emptyField(), label: "Nome", key: "nome", required: true, type: "text" },
        { ...emptyField(), label: "E-mail", key: "email", required: true, type: "email" },
        { ...emptyField(), label: "Telefone", key: "telefone", required: true, type: "phone" },
      ],
    });
    setModalOpen(true);
  }

  function openEdit(item: Form) {
    setEditing(item);
    setForm({
      name: item.name,
      funnelId: item.funnelId || "",
      isActive: item.isActive !== false,
      fields: (item.fields || []).map((field, index) => ({
        ...emptyField(),
        ...field,
        options: field.options || [],
        order: field.order ?? index,
      })),
    });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      name: form.name,
      funnelId: form.funnelId,
      isActive: form.isActive,
      fields: form.fields.map((field, index) => ({ ...field, order: index })),
    };
    if (editing) await resources.forms.update(editing._id, payload);
    else await resources.forms.create(payload);
    setModalOpen(false);
    await reload();
  }

  return (
    <>
      <Head><title>Formulários | Configurações | Noma CRM</title></Head>
      <ListWorkspace
        title="Formulários"
        actionLabel="Inserir formulário"
        onAction={openCreate}
        countLabel={`Existem ${forms?.length || 0} formulários na sua base. Envie pela negociação para gerar um código de 6 dígitos.`}
        columns={["Formulário", "Funil", "Campos", "Link", "Ações"]}
        emptyMessage="Não existem formulários salvos na sua base."
        isLoading={isLoading}
        error={error}
      >
        {(forms || []).map((item) => (
          <tr key={item._id} className="border-t border-charcoal/5">
            <td className="px-4 py-3 font-medium">{item.name}</td>
            <td className="px-4 py-3">{funnels?.find((funnel) => funnel._id === item.funnelId)?.name || "—"}</td>
            <td className="px-4 py-3">{(item.fields || []).map((field) => field.label || field.key).join(", ")}</td>
            <td className="px-4 py-3">
              <a className="text-sm text-tan hover:underline" href={publicFormUrl(item._id)} target="_blank" rel="noreferrer">
                Abrir
              </a>
            </td>
            <td className="px-4 py-3">
              <button type="button" className="text-sm font-medium text-tan" onClick={() => openEdit(item)}>
                Editar
              </button>
            </td>
          </tr>
        ))}
      </ListWorkspace>
      <Modal
        open={modalOpen}
        title={editing ? "Editar formulário" : "Novo formulário"}
        size="lg"
        onClose={() => setModalOpen(false)}
        footer={<button type="submit" form="form-builder" className="btn-primary">Salvar</button>}
      >
        <form id="form-builder" onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto pr-1">
          <FormField label="Nome">
            <input className="input-search" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="Funil vinculado">
            <Select value={form.funnelId} onChange={(funnelId) => setForm({ ...form, funnelId })} options={funnelOptions} />
          </FormField>
          <div className="mb-4 space-y-3">
            <p className="text-sm font-medium text-charcoal">Campos dinâmicos</p>
            {form.fields.map((field, index) => (
              <div key={`${field.key}-${index}`} className="rounded-xl border border-charcoal/10 p-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField label="Nome do campo">
                    <input
                      className="input-search"
                      value={field.label}
                      onChange={(e) => {
                        const fields = [...form.fields];
                        fields[index] = { ...field, label: e.target.value };
                        setForm({ ...form, fields });
                      }}
                      required
                    />
                  </FormField>
                  <FormField label="Tipo">
                    <Select
                      value={field.type}
                      onChange={(type) => {
                        const fields = [...form.fields];
                        fields[index] = { ...field, type: type as FormFieldType };
                        setForm({ ...form, fields });
                      }}
                      options={FORM_FIELD_TYPES.map((type) => ({ value: type, label: FORM_FIELD_TYPE_LABELS[type] }))}
                    />
                  </FormField>
                </div>
                {field.type === "select" || field.type === "multiselect" ? (
                  <FormField label="Opções (separadas por vírgula)">
                    <input
                      className="input-search"
                      value={field.options.join(", ")}
                      onChange={(e) => {
                        const fields = [...form.fields];
                        fields[index] = {
                          ...field,
                          options: e.target.value.split(",").map((option) => option.trim()).filter(Boolean),
                        };
                        setForm({ ...form, fields });
                      }}
                    />
                  </FormField>
                ) : null}
                <label className="flex items-center gap-2 text-sm text-charcoal/70">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => {
                      const fields = [...form.fields];
                      fields[index] = { ...field, required: e.target.checked };
                      setForm({ ...form, fields });
                    }}
                  />
                  Obrigatório
                </label>
                <button
                  type="button"
                  className="mt-2 text-xs text-burgundy"
                  onClick={() => setForm({ ...form, fields: form.fields.filter((_, fieldIndex) => fieldIndex !== index) })}
                >
                  Remover campo
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setForm({ ...form, fields: [...form.fields, emptyField()] })}
            >
              Adicionar campo
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
