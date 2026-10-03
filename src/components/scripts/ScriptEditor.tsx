import { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineTrash } from "react-icons/hi2";
import CopyButton from "@/components/tools/CopyButton";
import Field from "@/components/tools/Field";
import SaveStatus from "@/components/tools/SaveStatus";
import ToolSection from "@/components/tools/ToolSection";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToolDocument } from "@/hooks/useToolDocument";
import { briefingsApi } from "@/lib/briefing/api";
import { scriptsApi } from "@/lib/scripts/api";
import { SCRIPT_PRINT_CSS, scriptToHtml, scriptToText } from "@/lib/scripts/format";
import { newScene, normalize, titleOf, totalDuration, type ScriptData, type ScriptScene } from "@/lib/scripts/model";
import { printDocument } from "@/utils/document";

interface ScriptEditorProps {
  id: string;
  onBack: () => void;
  onDuplicate: () => Promise<void>;
  onDelete: () => Promise<void>;
}

function Area({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea className="input-search resize-y" rows={rows} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
  );
}

/** Editor de roteiro: dados gerais, briefing vinculado e a lista de cenas. */
export default function ScriptEditor({ id, onBack, onDuplicate, onDelete }: ScriptEditorProps) {
  const { user } = useAuth();
  const { data, setData, isLoading, error, saveState, ownerName, flush } = useToolDocument<ScriptData>({
    api: scriptsApi,
    id,
    normalize,
    titleOf,
  });
  const { data: briefings } = useAsyncData(() => briefingsApi.list(), []);
  const [busy, setBusy] = useState(false);
  const total = useMemo(() => (data ? totalDuration(data.scenes) : null), [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-24" />
        <div className="skeleton h-[480px]" />
      </div>
    );
  }

  if (error || !data || !total) {
    return (
      <div className="card p-6">
        <p className="text-sm text-burgundy">{error || "Roteiro não encontrado."}</p>
        <button type="button" className="btn-secondary mt-4" onClick={onBack}>
          ← Meus roteiros
        </button>
      </div>
    );
  }

  const showOwner = user?.role === "admin" && ownerName && ownerName !== user.name;
  const briefing = briefings?.find((doc) => doc._id === data.briefingId);
  const briefingTitle = briefing?.title || "";
  const briefingOptions = [
    { value: "", label: "Nenhum (roteiro avulso)" },
    ...(briefings || []).map((doc) => ({ value: doc._id, label: doc.title || "Sem título" })),
  ];
  // Briefing vinculado que o usuário não vê mais (de outra pessoa, ou excluído): mantém o vínculo.
  if (data.briefingId && briefings && !briefing) briefingOptions.push({ value: data.briefingId, label: "Briefing indisponível" });

  const patch = (value: Partial<ScriptData>) => setData((current) => ({ ...current, ...value }));
  const setScene = (sceneId: string, value: Partial<ScriptScene>) =>
    setData((current) => ({ ...current, scenes: current.scenes.map((scene) => (scene.id === sceneId ? { ...scene, ...value } : scene)) }));
  const moveScene = (index: number, to: number) =>
    setData((current) => {
      if (to < 0 || to >= current.scenes.length) return current;
      const scenes = current.scenes.slice();
      const [item] = scenes.splice(index, 1);
      scenes.splice(to, 0, item);
      return { ...current, scenes };
    });

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await flush();
      await action();
    } finally {
      setBusy(false);
    }
  }

  function handlePrint() {
    if (!data) return;
    printDocument(`Roteiro — ${titleOf(data)}`, scriptToHtml(data, briefingTitle), SCRIPT_PRINT_CSS);
  }

  return (
    <>
      <Head>
        <title>{`Roteiro — ${titleOf(data)} | Noma`}</title>
      </Head>
      <PageHeader
        eyebrow="Ferramenta de pré-produção"
        title="Roteiros"
        description={`Editando: ${titleOf(data)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SaveStatus state={saveState} />
            {showOwner ? <span className="chip bg-gold/10 text-gold">Documento de {ownerName}</span> : null}
            <button type="button" className="btn-secondary" onClick={() => void run(async () => onBack())}>
              ← Meus roteiros
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => void run(onDuplicate)}>
              Duplicar
            </button>
            <button type="button" className="btn-secondary !text-burgundy" disabled={busy} onClick={() => void run(onDelete)}>
              Excluir
            </button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <ToolSection step={1} title="Dados do roteiro">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título *">
                <input className="input-search" value={data.title} placeholder="Ex.: Reels lançamento — vídeo 1" onChange={(e) => patch({ title: e.target.value })} />
              </Field>
              <Field label="Cliente">
                <input className="input-search" value={data.client} onChange={(e) => patch({ client: e.target.value })} />
              </Field>
              <Field label="Formato">
                <input className="input-search" value={data.format} placeholder="Ex.: Vertical 9:16, até 60s" onChange={(e) => patch({ format: e.target.value })} />
              </Field>
              <Field label="Briefing vinculado" group>
                <Select value={data.briefingId} onChange={(briefingId) => patch({ briefingId })} options={briefingOptions} placeholder="Nenhum (roteiro avulso)" />
                {briefing ? (
                  <Link href={`/briefing?id=${briefing._id}`} className="mt-1 inline-block text-xs font-semibold text-tan hover:underline">
                    Abrir briefing →
                  </Link>
                ) : null}
              </Field>
            </div>
          </ToolSection>

          <ToolSection
            step={2}
            title="Cenas"
            description="Uma linha por cena: o que aparece, o que se ouve e quanto tempo dura."
          >
            <ol className="space-y-4">
              {data.scenes.map((scene, index) => (
                <li key={scene.id} className="rounded-xl border border-charcoal/10 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-tan">Cena {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" className="btn-ghost !h-8 !w-8" aria-label="Subir cena" disabled={index === 0} onClick={() => moveScene(index, index - 1)}>
                        <HiOutlineArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="btn-ghost !h-8 !w-8"
                        aria-label="Descer cena"
                        disabled={index === data.scenes.length - 1}
                        onClick={() => moveScene(index, index + 1)}
                      >
                        <HiOutlineArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="btn-ghost !h-8 !w-8 text-burgundy"
                        aria-label="Remover cena"
                        onClick={() => setData((current) => ({ ...current, scenes: current.scenes.filter((item) => item.id !== scene.id) }))}
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Descrição / ação">
                      <Area value={scene.description} onChange={(description) => setScene(scene.id, { description })} placeholder="O que aparece em quadro" />
                    </Field>
                    <Field label="Áudio / fala">
                      <Area value={scene.audio} onChange={(audio) => setScene(scene.id, { audio })} placeholder="Locução, fala ou trilha" />
                    </Field>
                    <Field label="Duração">
                      <input
                        className="input-search"
                        value={scene.duration}
                        placeholder="Ex.: 15s ou 0:15"
                        onChange={(e) => setScene(scene.id, { duration: e.target.value })}
                      />
                    </Field>
                    <Field label="Observações">
                      <input className="input-search" value={scene.notes} placeholder="Enquadramento, objeto de cena…" onChange={(e) => setScene(scene.id, { notes: e.target.value })} />
                    </Field>
                  </div>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="btn-secondary mt-4"
              onClick={() => setData((current) => ({ ...current, scenes: [...current.scenes, newScene()] }))}
            >
              + Adicionar cena
            </button>
          </ToolSection>

          <ToolSection step={3} title="Observações gerais">
            <Area value={data.notes} onChange={(notes) => patch({ notes })} placeholder="Tom, trilha, figurino, cuidados…" rows={4} />
          </ToolSection>
        </div>

        <aside className="min-w-0 space-y-3 self-start lg:sticky lg:top-20">
          <section className="card p-5">
            <p className="eyebrow">Resumo</p>
            <p className="mt-1 truncate text-lg font-semibold text-charcoal">{titleOf(data)}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              <div className="card-muted p-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/45">Cenas</dt>
                <dd className="mt-1 text-base font-semibold text-charcoal">{data.scenes.length}</dd>
              </div>
              <div className="card-muted p-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/45">Duração</dt>
                <dd className="mt-1 text-base font-semibold tabular-nums text-charcoal">{total.label}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-charcoal/50">A duração soma as cenas escritas como “15s”, “0:15” ou “1min”.</p>
          </section>
          <div className="grid grid-cols-2 gap-2">
            <CopyButton text={() => scriptToText(data, briefingTitle)} label="Copiar texto" className="btn-secondary" />
            <button type="button" className="btn-primary" onClick={handlePrint}>
              Imprimir / PDF
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
