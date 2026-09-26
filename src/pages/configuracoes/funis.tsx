import { useState } from "react";
import Head from "next/head";
import { HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineBars3 } from "react-icons/hi2";
import FunnelEditor from "@/components/crm/FunnelEditor";
import SettingsHeader from "@/components/settings/SettingsHeader";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";

export default function FunnelsSettingsPage() {
  const { funnels, setFunnels, reload } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const current = selectedId === "new" ? null : funnels.find((item) => item._id === selectedId) || funnels[0] || null;
  const creating = selectedId === "new" || !funnels.length;

  // A ordem daqui é a do seletor de funis no CRM.
  async function saveOrder(ids: string[]) {
    const previous = funnels;
    setFunnels(ids.map((id, order) => ({ ...funnels.find((item) => item._id === id)!, order })));
    setError("");
    try {
      await resources.funnels.reorder(ids);
    } catch (err) {
      setFunnels(previous);
      setError(apiError(err, "Não foi possível salvar a ordem dos funis."));
      void reload("funnels");
    }
  }

  function move(index: number, target: number) {
    if (target < 0 || target >= funnels.length || target === index) return;
    const ids = funnels.map((item) => item._id);
    const [id] = ids.splice(index, 1);
    ids.splice(target, 0, id);
    void saveOrder(ids);
  }

  return (
    <>
      <Head>
        <title>Funis | Configurações | Noma</title>
      </Head>
      <SettingsHeader
        title="Funis de venda"
        description="Crie funis diferentes para cada tipo de venda (eventos, conteúdo mensal, institucional...). Arraste para mudar a ordem."
        actions={
          <button type="button" className="btn-primary" onClick={() => setSelectedId("new")}>
            Novo funil
          </button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav className="card self-start p-3">
          {funnels.map((funnel, index) => {
            const active = !creating && current?._id === funnel._id;
            return (
              <div
                key={funnel._id}
                draggable={funnels.length > 1}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  setDraggingId(funnel._id);
                }}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(event) => {
                  if (!draggingId || draggingId === funnel._id) return;
                  event.preventDefault();
                  const from = funnels.findIndex((item) => item._id === draggingId);
                  const ids = funnels.map((item) => item._id);
                  ids.splice(from, 1);
                  ids.splice(index, 0, draggingId);
                  setFunnels(ids.map((id) => funnels.find((item) => item._id === id)!));
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDraggingId(null);
                  void saveOrder(funnels.map((item) => item._id));
                }}
                className={`group flex items-center gap-1 rounded-lg transition ${draggingId === funnel._id ? "opacity-40" : ""}`}
              >
                <HiOutlineBars3 className="h-4 w-4 shrink-0 cursor-grab text-charcoal/25 group-hover:text-charcoal/50" aria-hidden />
                <button
                  type="button"
                  onClick={() => setSelectedId(funnel._id)}
                  className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                    active ? "bg-tan/10 font-semibold text-tan" : "text-charcoal/70 hover:bg-beige"
                  }`}
                >
                  <span className="truncate">{funnel.name}</span>
                  <span className="shrink-0 text-xs text-charcoal/40">{funnel.stages.length} etapas</span>
                </button>
                <div className="flex shrink-0 flex-col opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <button type="button" className="text-charcoal/40 hover:text-charcoal disabled:opacity-30" aria-label={`Subir ${funnel.name}`} disabled={index === 0} onClick={() => move(index, index - 1)}>
                    <HiOutlineArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-charcoal/40 hover:text-charcoal disabled:opacity-30"
                    aria-label={`Descer ${funnel.name}`}
                    disabled={index === funnels.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <HiOutlineArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {creating ? <p className="rounded-lg bg-tan/10 px-3 py-2 text-sm font-semibold text-tan">Novo funil</p> : null}
          {error ? <p className="mt-2 px-1 text-xs text-burgundy">{error}</p> : null}
        </nav>
        <section className="card p-5 sm:p-6">
          <FunnelEditor
            key={creating ? "new" : current?._id}
            funnel={creating ? null : current}
            onSaved={(saved) => setSelectedId(saved._id)}
            onDeleted={() => setSelectedId(null)}
          />
        </section>
      </div>
    </>
  );
}
