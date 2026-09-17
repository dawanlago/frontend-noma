import { FormEvent, useState } from "react";
import Head from "next/head";
import FormField from "@/components/ui/FormField";
import ListWorkspace from "@/components/ui/ListWorkspace";
import Modal from "@/components/ui/Modal";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";

export default function SettingsLabelsPage() {
  const { data: labels, isLoading, error, reload } = useAsyncData(() => resources.labels.list());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", color: "#C4844A" });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await resources.labels.create(form);
    setModalOpen(false);
    await reload();
  }

  return (
    <>
      <Head><title>Etiquetas | Configurações | Noma CRM</title></Head>
      <ListWorkspace title="Etiquetas" actionLabel="Inserir etiqueta" onAction={() => setModalOpen(true)} countLabel={`Existem ${labels?.length || 0} etiquetas na sua base`} columns={["Etiqueta", "Cor"]} emptyMessage="Não existem etiquetas salvas na sua base." isLoading={isLoading} error={error}>
        {(labels || []).map((label) => (
          <tr key={label._id} className="border-t border-charcoal/5">
            <td className="px-4 py-3 font-medium">{label.name}</td>
            <td className="px-4 py-3"><span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full" style={{ backgroundColor: label.color }} />{label.color}</span></td>
          </tr>
        ))}
      </ListWorkspace>
      <Modal open={modalOpen} title="Nova etiqueta" onClose={() => setModalOpen(false)} footer={<button type="submit" form="label-form" className="btn-primary">Salvar</button>}>
        <form id="label-form" onSubmit={handleSubmit}>
          <FormField label="Nome"><input className="input-search" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></FormField>
          <FormField label="Cor"><input className="input-search" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></FormField>
        </form>
      </Modal>
    </>
  );
}
