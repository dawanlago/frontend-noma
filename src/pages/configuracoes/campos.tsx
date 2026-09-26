import { useState } from "react";
import Head from "next/head";
import { HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineTrash } from "react-icons/hi2";
import OptionListEditor from "@/components/options/OptionListEditor";
import SettingsHeader from "@/components/settings/SettingsHeader";
import Select from "@/components/ui/Select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { CustomField, CustomFieldEntity, CustomFieldType } from "@/types";
import { confirmDialog } from "@/components/ui/DialogHost";

const ENTITIES: { value: CustomFieldEntity; label: string; description: string }[] = [
  { value: "lead", label: "Negociações", description: "Aparecem no cadastro e no painel de cada negociação do CRM." },
  { value: "contact", label: "Contatos", description: "Aparecem no cadastro e no perfil dos contatos." },
  { value: "company", label: "Empresas", description: "Aparecem no cadastro e no perfil das empresas." },
  {
    value: "prospecting",
    label: "Prospecção",
    description: "Aparecem no Gerador de Prospecção. Use {chave} nas mensagens para inserir a resposta.",
  },
];

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "select", label: "Seleção (uma opção)" },
  { value: "multiselect", label: "Seleção (várias opções)" },
];

export default function CustomFieldsPage() {
  const { fieldsOf, reload } = useWorkspace();
  const [entity, setEntity] = useState<CustomFieldEntity>("lead");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");
  const [openOptions, setOpenOptions] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fields = fieldsOf(entity);
  const info = ENTITIES.find((item) => item.value === entity)!;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await reload("customFields", "options");
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar o campo."));
    } finally {
      setBusy(false);
    }
  }

  function handleAdd() {
    if (!label.trim()) return;
    void run(async () => {
      const field = await resources.customFields.create({ entity, label: label.trim(), type });
      setLabel("");
      if (type === "select" || type === "multiselect") setOpenOptions(field._id);
    });
  }

  function move(index: number, delta: number) {
    const target = fields[index + delta];
    const current = fields[index];
    if (!target) return;
    void run(() =>
      Promise.all([
        resources.customFields.update(current._id, { order: target.order }),
        resources.customFields.update(target._id, { order: current.order }),
      ]),
    );
  }

  async function handleDelete(field: CustomField) {
    if (!(await confirmDialog({ title: `Excluir o campo "${field.label}"?`, message: "Os valores já preenchidos nele deixam de aparecer.", confirmLabel: "Excluir", danger: true }))) return;
    void run(() => resources.customFields.remove(field._id));
  }

  return (
    <>
      <Head>
        <title>Campos personalizados | Configurações | Noma</title>
      </Head>
      <SettingsHeader
        title="Campos personalizados"
        description="Crie os campos que fazem sentido para a sua produtora, com texto livre ou opções de seleção."
      />

      <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" className="inline-flex min-w-max gap-1 rounded-xl bg-beige p-1">
          {ENTITIES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={entity === item.value}
              onClick={() => setEntity(item.value)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                entity === item.value ? "bg-surface text-charcoal shadow-soft" : "text-charcoal/55 hover:text-charcoal"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <section className="card p-5 sm:p-6">
        <p className="mb-4 text-sm text-charcoal/55">{info.description}</p>
        <form
          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_240px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            handleAdd();
          }}
        >
          <input className="input-search" placeholder="Nome do campo (ex.: Tamanho da equipe)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Select value={type} onChange={(value) => setType(value as CustomFieldType)} options={FIELD_TYPES} />
          <button type="submit" className="btn-primary" disabled={busy || !label.trim()}>
            Criar campo
          </button>
        </form>
        {error ? <p className="mt-2 text-sm text-burgundy">{error}</p> : null}

        <ul className="mt-5 space-y-2">
          {fields.length === 0 ? <li className="text-sm text-charcoal/50">Nenhum campo criado nesta área.</li> : null}
          {fields.map((field, index) => {
            const hasOptions = field.type === "select" || field.type === "multiselect";
            return (
              <li key={field._id} className="rounded-lg border border-charcoal/[0.08]">
                <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal">{field.label}</p>
                    <p className="text-xs text-charcoal/50">
                      {FIELD_TYPES.find((item) => item.value === field.type)?.label} · chave{" "}
                      <code className="rounded bg-beige px-1">{`{${field.key}}`}</code>
                    </p>
                  </div>
                  {hasOptions ? (
                    <button type="button" className="btn-secondary !py-1.5" onClick={() => setOpenOptions(openOptions === field._id ? null : field._id)}>
                      {openOptions === field._id ? "Fechar opções" : "Opções"}
                    </button>
                  ) : null}
                  <button type="button" className="btn-ghost h-8 w-8" aria-label="Subir" disabled={busy || index === 0} onClick={() => move(index, -1)}>
                    <HiOutlineArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost h-8 w-8"
                    aria-label="Descer"
                    disabled={busy || index === fields.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <HiOutlineArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="btn-ghost h-8 w-8 hover:text-burgundy" aria-label="Excluir" onClick={() => handleDelete(field)}>
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                </div>
                {hasOptions && openOptions === field._id ? (
                  <div className="border-t border-charcoal/[0.06] bg-beige/40 p-3">
                    <OptionListEditor list={`field:${field._id}`} autoFocus />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
