import { useEffect, useState } from "react";
import Link from "next/link";
import { HiOutlineTrash } from "react-icons/hi2";
import OptionSelect from "@/components/options/OptionSelect";
import Field from "@/components/tools/Field";
import { confirmDialog } from "@/components/ui/DialogHost";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { RelationItem, RelationKind } from "@/types";
import EntityAvatar from "./Avatar";
import EntityPicker, { type PickerItem } from "./EntityPicker";

const KIND_LABELS: Record<RelationKind, string> = { contact: "Contato", company: "Empresa", lead: "Negociação" };
const SELF_LABELS: Record<RelationKind, string> = { contact: "este contato", company: "esta empresa", lead: "esta negociação" };
const HREFS: Record<RelationKind, string> = { contact: "/contatos", company: "/empresas", lead: "/crm" };

async function loadItems(kind: RelationKind): Promise<PickerItem[]> {
  if (kind === "contact") {
    return (await resources.contacts.list()).map((item) => ({ id: item._id, label: item.name, sublabel: item.phone || item.email, image: item.photo }));
  }
  if (kind === "company") {
    return (await resources.companies.list()).map((item) => ({ id: item._id, label: item.name, sublabel: item.taxId, image: item.logo }));
  }
  return (await resources.leads.list()).map((item) => ({ id: item._id, label: item.name, sublabel: item.contactName || item.company }));
}

interface RelationsCardProps {
  kind: RelationKind;
  id: string;
}

/** Cartão "Relações": liga este registro a outros contatos, empresas ou negociações (sócio, cônjuge, indicou...). */
export default function RelationsCard({ kind, id }: RelationsCardProps) {
  const { can } = useAuth();
  const { labelOf } = useWorkspace();
  const canWrite = can("base", "crm", "financeiro", "formularios");
  const [relations, setRelations] = useState<RelationItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [otherKind, setOtherKind] = useState<RelationKind>("contact");
  const [otherId, setOtherId] = useState("");
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<PickerItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    resources.relations
      .list(kind, id)
      .then(setRelations)
      .catch(() => setRelations([]));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void (id && load()), [kind, id]);

  useEffect(() => {
    if (!open) return;
    setLoadingItems(true);
    loadItems(otherKind)
      .then((list) => setItems(list.filter((item) => !(otherKind === kind && item.id === id))))
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false));
  }, [open, otherKind, kind, id]);

  function openForm() {
    setType("");
    setOtherId("");
    setDirection("out");
    setNote("");
    setError("");
    setOpen(true);
  }

  async function handleSave() {
    if (!type || !otherId) {
      setError("Escolha o tipo da relação e o registro.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const self = { kind, id };
      const other = { kind: otherKind, id: otherId };
      await resources.relations.create(direction === "out" ? { from: self, to: other, type, note } : { from: other, to: self, type, note });
      setOpen(false);
      load();
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar a relação."));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(relation: RelationItem) {
    if (!(await confirmDialog({ title: `Remover a relação com ${relation.other.name}?`, confirmLabel: "Remover", danger: true }))) return;
    try {
      await resources.relations.remove(relation._id);
      setRelations((current) => (current || []).filter((item) => item._id !== relation._id));
    } catch {
      load();
    }
  }

  const typeLabel = type ? labelOf("relationType", type) : "[tipo]";

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-charcoal">Relações</h2>
        {canWrite ? (
          <button type="button" className="text-sm font-semibold text-tan hover:underline" onClick={openForm}>
            + Adicionar
          </button>
        ) : null}
      </div>
      {relations === null ? (
        <div className="skeleton h-10" />
      ) : relations.length ? (
        <ul className="space-y-2">
          {relations.map((relation) => (
            <li key={relation._id} className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-beige">
              <Link href={`${HREFS[relation.other.kind]}/${relation.other.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <EntityAvatar name={relation.other.name} image={relation.other.image} square={relation.other.kind !== "contact"} size={32} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-charcoal">{relation.other.name}</span>
                  {/* "→": a relação parte deste registro; "←": parte do outro. */}
                  <span
                    className="block truncate text-xs text-charcoal/55"
                    title={
                      relation.direction === "out"
                        ? `${SELF_LABELS[kind]} → ${labelOf("relationType", relation.type)} → ${relation.other.name}`
                        : `${relation.other.name} → ${labelOf("relationType", relation.type)} → ${SELF_LABELS[kind]}`
                    }
                  >
                    {relation.direction === "out" ? "→ " : "← "}
                    {labelOf("relationType", relation.type)} · {KIND_LABELS[relation.other.kind]}
                    {relation.note ? ` · ${relation.note}` : ""}
                  </span>
                </span>
              </Link>
              {canWrite ? (
                <button type="button" className="btn-ghost h-7 w-7 shrink-0 hover:text-burgundy" aria-label="Remover relação" onClick={() => void handleRemove(relation)}>
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-charcoal/50">Nenhuma relação cadastrada.</p>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nova relação"
        description="Ligue este registro a outro contato, empresa ou negociação."
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Salvando..." : "Salvar relação"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 pt-1 sm:grid-cols-2">
          <Field label="Tipo de relação">
            <OptionSelect list="relationType" value={type} onChange={setType} />
          </Field>
          <Field label="Com" group>
            <Select
              value={otherKind}
              onChange={(value) => {
                setOtherKind(value as RelationKind);
                setOtherId("");
              }}
              options={(Object.keys(KIND_LABELS) as RelationKind[]).map((value) => ({ value, label: KIND_LABELS[value] }))}
            />
          </Field>
          <Field label={KIND_LABELS[otherKind]} full group>
            <EntityPicker
              items={items}
              value={otherId}
              onChange={setOtherId}
              loading={loadingItems}
              square={otherKind !== "contact"}
              showAvatar={otherKind !== "lead"}
              placeholder={`Buscar ${KIND_LABELS[otherKind].toLowerCase()}`}
            />
          </Field>
          <Field label="Sentido" full group hint="Importa em relações como “Indicou” ou “Fornecedor de”.">
            <Select
              value={direction}
              onChange={(value) => setDirection(value as "out" | "in")}
              options={[
                { value: "out", label: `${SELF_LABELS[kind]} → ${typeLabel} → o registro escolhido` },
                { value: "in", label: `o registro escolhido → ${typeLabel} → ${SELF_LABELS[kind]}` },
              ]}
            />
          </Field>
          <Field label="Observação" full>
            <input className="input-search" value={note} placeholder="Opcional" onChange={(e) => setNote(e.target.value)} />
          </Field>
          {error ? <p className="text-sm font-medium text-burgundy sm:col-span-2">{error}</p> : null}
        </div>
      </Modal>
    </section>
  );
}
