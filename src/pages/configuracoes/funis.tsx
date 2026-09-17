import { FormEvent, useState } from "react";
import Head from "next/head";
import FormField from "@/components/ui/FormField";
import ListWorkspace from "@/components/ui/ListWorkspace";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import { STAGE_TYPE_LABELS, STAGE_TYPES } from "@/lib/constants";
import type { Funnel, FunnelStage, StageType } from "@/types";

const emptyStage = (order: number): Omit<FunnelStage, "_id"> & { _id?: string } => ({
  name: "NOVA ETAPA",
  order,
  type: "general",
});

export default function SettingsFunnelsPage() {
  const { data: funnels, isLoading, error, reload } = useAsyncData(() => resources.funnels.list());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Funnel | null>(null);
  const [form, setForm] = useState({
    name: "",
    stages: [emptyStage(1)] as Array<Omit<FunnelStage, "_id"> & { _id?: string }>,
  });

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      stages: [
        { name: "LEAD", order: 1, type: "general" },
        { name: "QUALIFICADO", order: 2, type: "general" },
        { name: "AGENDAMENTO", order: 3, type: "agenda" },
        { name: "PROPOSTA", order: 4, type: "general" },
        { name: "FECHAMENTO", order: 5, type: "closure" },
      ],
    });
    setModalOpen(true);
  }

  function openEdit(funnel: Funnel) {
    setEditing(funnel);
    setForm({
      name: funnel.name,
      stages: funnel.stages
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((stage) => ({ ...stage })),
    });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      name: form.name,
      stages: form.stages.map((stage, index) => ({
        ...stage,
        order: index + 1,
        type: stage.type as StageType,
      })),
    };
    if (editing) await resources.funnels.update(editing._id, payload as Partial<Funnel>);
    else await resources.funnels.create(payload as Partial<Funnel>);
    setModalOpen(false);
    await reload();
  }

  return (
    <>
      <Head><title>Funis | Configurações | Noma CRM</title></Head>
      <ListWorkspace
        title="Funis"
        actionLabel="Inserir funil"
        onAction={openCreate}
        countLabel={`Existem ${funnels?.length || 0} funis na sua base`}
        columns={["Funil", "Etapas", "Tipos", "Ações"]}
        emptyMessage="Não existem funis salvos na sua base."
        isLoading={isLoading}
        error={error}
      >
        {(funnels || []).map((funnel) => (
          <tr key={funnel._id} className="border-t border-charcoal/5">
            <td className="px-4 py-3 font-medium">{funnel.name}</td>
            <td className="px-4 py-3">{funnel.stages.map((stage) => stage.name).join(", ")}</td>
            <td className="px-4 py-3">{funnel.stages.map((stage) => STAGE_TYPE_LABELS[stage.type]).join(", ")}</td>
            <td className="px-4 py-3">
              <button type="button" className="text-sm font-medium text-tan" onClick={() => openEdit(funnel)}>
                Editar etapas
              </button>
            </td>
          </tr>
        ))}
      </ListWorkspace>

      <Modal
        open={modalOpen}
        title={editing ? "Editar funil" : "Novo funil"}
        size="lg"
        onClose={() => setModalOpen(false)}
        footer={<button type="submit" form="funnel-form" className="btn-primary">Salvar</button>}
      >
        <form id="funnel-form" onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto pr-1">
          <FormField label="Nome do funil">
            <input className="input-search" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <div className="space-y-3">
            {form.stages.map((stage, index) => (
              <div key={`${stage._id || "new"}-${index}`} className="grid gap-3 rounded-xl border border-charcoal/10 p-3 md:grid-cols-[1fr_180px_auto]">
                <FormField label="Etapa">
                  <input
                    className="input-search"
                    value={stage.name}
                    onChange={(e) => {
                      const stages = [...form.stages];
                      stages[index] = { ...stage, name: e.target.value };
                      setForm({ ...form, stages });
                    }}
                    required
                  />
                </FormField>
                <FormField label="Tipo">
                  <Select
                    value={stage.type}
                    onChange={(type) => {
                      const stages = [...form.stages];
                      stages[index] = { ...stage, type: type as StageType };
                      setForm({ ...form, stages });
                    }}
                    options={STAGE_TYPES.map((type) => ({ value: type, label: STAGE_TYPE_LABELS[type] }))}
                  />
                </FormField>
                <button
                  type="button"
                  className="self-end text-sm text-burgundy"
                  onClick={() => setForm({ ...form, stages: form.stages.filter((_, stageIndex) => stageIndex !== index) })}
                >
                  Remover
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setForm({ ...form, stages: [...form.stages, emptyStage(form.stages.length + 1)] })}
            >
              Adicionar etapa
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
