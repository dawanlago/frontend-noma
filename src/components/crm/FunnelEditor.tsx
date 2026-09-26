import { useEffect, useState } from "react";
import { HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineTrash, HiXMark } from "react-icons/hi2";
import Select from "@/components/ui/Select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Funnel, StageKind } from "@/types";
import { confirmDialog } from "@/components/ui/DialogHost";

export const STAGE_KINDS: { value: StageKind; label: string }[] = [
  { value: "open", label: "Em andamento" },
  { value: "won", label: "Venda feita" },
  { value: "lost", label: "Perdida" },
];

interface DraftStage {
  _id?: string;
  name: string;
  kind: StageKind;
  color: string;
  subStages?: { _id?: string; name: string }[];
}

const NEW_FUNNEL: DraftStage[] = [
  { name: "Novo lead", kind: "open", color: "" },
  { name: "Primeiro contato", kind: "open", color: "" },
  { name: "Proposta enviada", kind: "open", color: "" },
  { name: "Em negociação", kind: "open", color: "" },
  { name: "Venda feita", kind: "won", color: "" },
  { name: "Perdido", kind: "lost", color: "" },
];

interface FunnelEditorProps {
  /** null = criar um funil novo. */
  funnel: Funnel | null;
  onSaved?: (funnel: Funnel) => void;
  onDeleted?: () => void;
}

/** Nome e etapas de um funil. Usado em Configurações → Funis e no atalho do cadastro de venda. */
export default function FunnelEditor({ funnel, onSaved, onDeleted }: FunnelEditorProps) {
  const { funnels, setFunnels } = useWorkspace();
  const [name, setName] = useState("");
  const [stages, setStages] = useState<DraftStage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(funnel?.name || "");
    setStages(
      funnel
        ? funnel.stages.map((stage) => ({ ...stage, subStages: (stage.subStages || []).map((sub) => ({ ...sub })) }))
        : NEW_FUNNEL.map((stage) => ({ ...stage })),
    );
    setError("");
  }, [funnel]);

  const updateStage = (index: number, changes: Partial<DraftStage>) =>
    setStages((current) => current.map((stage, i) => (i === index ? { ...stage, ...changes } : stage)));

  function move(index: number, delta: number) {
    setStages((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    const clean = stages.filter((stage) => stage.name.trim());
    if (!name.trim() || !clean.length) {
      setError("Dê um nome ao funil e mantenha pelo menos uma etapa.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        stages: clean.map((stage) => ({ ...stage, subStages: (stage.subStages || []).filter((sub) => sub.name.trim()) })) as Funnel["stages"],
      };
      const saved = funnel ? await resources.funnels.update(funnel._id, payload) : await resources.funnels.create(payload);
      setFunnels(funnel ? funnels.map((item) => (item._id === saved._id ? saved : item)) : [...funnels, saved]);
      onSaved?.(saved);
    } catch (err) {
      setError(apiError(err, "Não foi possível salvar o funil."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!funnel || !(await confirmDialog({ title: `Excluir o funil "${funnel.name}"?`, confirmLabel: "Excluir", danger: true }))) return;
    setBusy(true);
    setError("");
    try {
      await resources.funnels.remove(funnel._id);
      setFunnels(funnels.filter((item) => item._id !== funnel._id));
      onDeleted?.();
    } catch (err) {
      setError(apiError(err, "Não foi possível excluir o funil."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-charcoal">Nome do funil</span>
        <input className="input-search" value={name} placeholder="Ex.: Eventos corporativos" onChange={(e) => setName(e.target.value)} />
      </label>

      <p className="mb-2 mt-5 text-[13px] font-semibold text-charcoal">Etapas</p>
      <ul className="space-y-2">
        {stages.map((stage, index) => (
          <li key={stage._id || `new-${index}`} className="grid gap-2 rounded-lg border border-charcoal/[0.08] p-2 sm:grid-cols-[minmax(0,1fr)_170px_auto]">
            <input className="input-search !py-2" value={stage.name} placeholder="Nome da etapa" onChange={(e) => updateStage(index, { name: e.target.value })} />
            <Select value={stage.kind} onChange={(kind) => updateStage(index, { kind: kind as StageKind })} options={STAGE_KINDS} />
            <div className="flex items-center justify-end">
              <button type="button" className="btn-ghost h-9 w-9" aria-label="Subir" disabled={index === 0} onClick={() => move(index, -1)}>
                <HiOutlineArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="btn-ghost h-9 w-9" aria-label="Descer" disabled={index === stages.length - 1} onClick={() => move(index, 1)}>
                <HiOutlineArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="btn-ghost h-9 w-9 hover:text-burgundy"
                aria-label="Remover etapa"
                disabled={stages.length <= 1}
                onClick={() => setStages((current) => current.filter((_, i) => i !== index))}
              >
                <HiOutlineTrash className="h-4 w-4" />
              </button>
            </div>
            <SubStagesEditor
              value={stage.subStages || []}
              onChange={(subStages) => updateStage(index, { subStages })}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn-secondary mt-3"
        onClick={() => setStages((current) => [...current, { name: "", kind: "open", color: "" }])}
      >
        + Adicionar etapa
      </button>
      <p className="mt-3 text-xs text-charcoal/50">
        Microetapas dividem uma etapa em passos menores (ex.: “Proposta enviada” → “Aguardando retorno”, “Em ajuste”) e
        medem quantos dias a negociação fica em cada uma. Ao remover uma etapa, as negociações dela vão para a primeira etapa “Em andamento”. O botão “Venda feita” move a
        negociação para a primeira etapa do tipo “Venda feita”.
      </p>

      {error ? <p className="mt-3 text-sm text-burgundy">{error}</p> : null}
      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <div>
          {funnel && onDeleted ? (
            <button type="button" className="btn-secondary !text-burgundy" disabled={busy} onClick={() => void handleDelete()}>
              Excluir funil
            </button>
          ) : null}
        </div>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void handleSave()}>
          {busy ? "Salvando..." : funnel ? "Salvar funil" : "Criar funil"}
        </button>
      </div>
    </div>
  );
}

/** Microetapas de uma etapa: pílulas removíveis + campo para adicionar. */
function SubStagesEditor({ value, onChange }: { value: { _id?: string; name: string }[]; onChange: (next: { _id?: string; name: string }[]) => void }) {
  const [draft, setDraft] = useState("");
  function add() {
    if (!draft.trim()) return;
    onChange([...value, { name: draft.trim() }]);
    setDraft("");
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:col-span-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal/40">Microetapas</span>
      {value.map((sub, index) => (
        <span key={sub._id || `new-${index}`} className="inline-flex items-center gap-0.5 rounded-full bg-tan/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-tan">
          <input
            className="w-auto min-w-[3ch] bg-transparent focus:outline-none"
            size={Math.max(3, sub.name.length)}
            value={sub.name}
            aria-label="Nome da microetapa"
            onChange={(event) => onChange(value.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))}
          />
          <button
            type="button"
            className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-tan/20"
            aria-label={`Remover microetapa ${sub.name}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <HiXMark className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        className="h-7 min-w-[140px] flex-1 rounded-full border border-dashed border-charcoal/15 bg-transparent px-3 text-xs text-charcoal placeholder:text-charcoal/40 focus:border-tan focus:outline-none"
        value={draft}
        placeholder="+ Adicionar microetapa (Enter)"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
    </div>
  );
}
