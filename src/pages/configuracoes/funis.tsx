import { useState } from "react";
import Head from "next/head";
import FunnelEditor from "@/components/crm/FunnelEditor";
import SettingsHeader from "@/components/settings/SettingsHeader";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function FunnelsSettingsPage() {
  const { funnels } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const current = selectedId === "new" ? null : funnels.find((item) => item._id === selectedId) || funnels[0] || null;
  const creating = selectedId === "new" || !funnels.length;

  return (
    <>
      <Head>
        <title>Funis | Configurações | Noma</title>
      </Head>
      <SettingsHeader
        title="Funis de venda"
        description="Crie funis diferentes para cada tipo de venda (eventos, conteúdo mensal, institucional...)."
        actions={
          <button type="button" className="btn-primary" onClick={() => setSelectedId("new")}>
            Novo funil
          </button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav className="card self-start p-3">
          {funnels.map((funnel) => {
            const active = !creating && current?._id === funnel._id;
            return (
              <button
                key={funnel._id}
                type="button"
                onClick={() => setSelectedId(funnel._id)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  active ? "bg-tan/10 font-semibold text-tan" : "text-charcoal/70 hover:bg-beige"
                }`}
              >
                <span className="truncate">{funnel.name}</span>
                <span className="text-xs text-charcoal/40">{funnel.stages.length} etapas</span>
              </button>
            );
          })}
          {creating ? <p className="rounded-lg bg-tan/10 px-3 py-2 text-sm font-semibold text-tan">Novo funil</p> : null}
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
