import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Label } from "@/types";

/** Etiquetas de uma negociação, na ordem do cadastro (ignora as que foram apagadas). */
function pick(labels: Label[], ids: string[] = []) {
  return labels.filter((label) => ids.includes(label._id));
}

function Dot({ color }: { color: string }) {
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />;
}

/** Chips das etiquetas (cartão e detalhe da negociação). */
export function LeadLabelChips({ ids }: { ids?: string[] }) {
  const items = pick(useWorkspace().labels, ids);
  if (!items.length) return null;
  return (
    <>
      {items.map((label) => (
        <span key={label._id} className="chip gap-1.5 bg-charcoal/[0.05] text-charcoal/75" title="Etiqueta">
          <Dot color={label.color} />
          {label.name}
        </span>
      ))}
    </>
  );
}

/** Seleção de várias etiquetas: clique para marcar ou desmarcar. */
export function LeadLabelPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { labels } = useWorkspace();
  const { can } = useAuth();

  if (!labels.length) {
    return (
      <p className="text-xs text-charcoal/50">
        Nenhuma etiqueta cadastrada.
        {can("configuracoes") ? (
          <>
            {" "}
            <Link href="/configuracoes/etiquetas" className="font-semibold text-tan hover:underline">
              Criar etiquetas
            </Link>
          </>
        ) : null}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Etiquetas">
      {labels.map((label) => {
        const active = value.includes(label._id);
        return (
          <button
            key={label._id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? value.filter((id) => id !== label._id) : [...value, label._id])}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
              active ? "border-charcoal/30 bg-charcoal/[0.07] text-charcoal" : "border-charcoal/10 text-charcoal/55 hover:text-charcoal"
            }`}
          >
            <Dot color={label.color} />
            {label.name}
          </button>
        );
      })}
    </div>
  );
}
