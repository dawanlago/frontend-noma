import { FormEvent, useState } from "react";
import Head from "next/head";
import { HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2";
import { confirmDialog } from "@/components/ui/DialogHost";
import FormField from "@/components/ui/FormField";
import ListWorkspace from "@/components/ui/ListWorkspace";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import Modal from "@/components/ui/Modal";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Label } from "@/types";

const EMPTY = { name: "", color: "#C4844A" };

export default function SettingsLabelsPage() {
  const { data: labels, isLoading, error, reload: reloadList } = useAsyncData(() => resources.labels.list());
  const workspace = useWorkspace();
  // Atualiza a lista desta tela e a usada no CRM.
  const reload = () => Promise.all([reloadList(), workspace.reload("labels")]);
  const [modalOpen, setModalOpen] = useState(false);
  // Etiqueta em edição ("" = nova).
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");

  function openNew() {
    setEditingId("");
    setForm(EMPTY);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(label: Label) {
    setEditingId(label._id);
    setForm({ name: label.name, color: label.color });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      if (editingId) await resources.labels.update(editingId, form);
      else await resources.labels.create(form);
      setModalOpen(false);
      await reload();
    } catch (err) {
      setFormError(apiError(err, "Não foi possível salvar a etiqueta."));
    }
  }

  async function handleDelete(label: Label) {
    if (!(await confirmDialog({ title: `Excluir a etiqueta "${label.name}"?`, message: "Ela sai de todas as negociações em que estiver.", confirmLabel: "Excluir", danger: true }))) return;
    await resources.labels.remove(label._id);
    await reload();
  }

  return (
    <>
      <Head><title>Etiquetas | Configurações | Noma</title></Head>
      <ListWorkspace title="Etiquetas" actionLabel="Inserir etiqueta" onAction={openNew} countLabel={`Existem ${labels?.length || 0} etiquetas na sua base`} columns={["Etiqueta", "Cor", ""]} emptyMessage="Não existem etiquetas salvas na sua base." isLoading={isLoading} error={error}>
        {(labels || []).map((label) => (
          <tr key={label._id} className="border-t border-charcoal/5">
            <td className="px-4 py-3 font-medium">{label.name}</td>
            <td className="px-4 py-3"><span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full" style={{ backgroundColor: label.color }} />{label.color}</span></td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-1">
                <button type="button" className="btn-ghost h-8 w-8" aria-label="Editar" onClick={() => openEdit(label)}>
                  <HiOutlinePencilSquare className="h-4 w-4" />
                </button>
                <button type="button" className="btn-ghost h-8 w-8 hover:text-burgundy" aria-label="Excluir" onClick={() => handleDelete(label)}>
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </ListWorkspace>
      <Modal open={modalOpen} title={editingId ? "Editar etiqueta" : "Nova etiqueta"} onClose={() => setModalOpen(false)} footer={<button type="submit" form="label-form" className="btn-primary">Salvar</button>}>
        <form id="label-form" onSubmit={handleSubmit}>
          <FormField label="Nome"><input className="input-search" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></FormField>
          <FormField label="Cor"><input className="input-search" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></FormField>
          {formError ? <p className="text-xs font-medium text-burgundy">{formError}</p> : null}
        </form>
      </Modal>
    </>
  );
}
