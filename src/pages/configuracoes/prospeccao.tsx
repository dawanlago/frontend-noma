import { useEffect, useState } from "react";
import Head from "next/head";
import OptionListEditor from "@/components/options/OptionListEditor";
import SettingsHeader from "@/components/settings/SettingsHeader";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { DEFAULT_SEGMENTS, goalTexts, opportunityTexts, type SegmentCopy } from "@/lib/prospecting/generate";
import { STYLES } from "@/lib/prospecting/options";
import { resources } from "@/lib/resources";
import type { OptionItem } from "@/types";
import { confirmDialog } from "@/components/ui/DialogHost";

type Tab = "prospectOpportunity" | "prospectGoal" | "prospectSegment";

const TABS: { value: Tab; label: string; description: string }[] = [
  {
    value: "prospectOpportunity",
    label: "Oportunidades",
    description: "A frase que apresenta a oportunidade em cada estilo de mensagem. Ajuste a ancoragem de cada produto do seu jeito.",
  },
  { value: "prospectGoal", label: "Objetivos", description: "A frase final (chamada) usada para cada objetivo da mensagem." },
  {
    value: "prospectSegment",
    label: "Segmentos",
    description: "O que o vídeo pode mostrar em cada segmento e os argumentos usados quando não há observação específica.",
  },
];

const SEGMENT_FIELDS: { key: keyof SegmentCopy; label: string; hint: string }[] = [
  { key: "angle", label: "O que o vídeo pode mostrar ({angulo})", hint: "Ex.: os pratos e o clima da casa" },
  { key: "hook", label: "Abertura sem observação específica", hint: "Usada quando a observação está vazia ou genérica." },
  { key: "question", label: "Pergunta de diagnóstico", hint: "Entra na versão consultiva." },
  { key: "business", label: "Argumento de negócio", hint: "Usado no LinkedIn e no e-mail consultivo." },
];

function metaOf(options: OptionItem[]) {
  return (list: string, value: string) => options.find((item) => item.list === list && item.value === value)?.meta;
}

function MessageCard({ item }: { item: OptionItem }) {
  const { options, upsertOption, fieldsOf } = useWorkspace();
  const tab = item.list as Tab;
  const initial = (): Record<string, string> => {
    if (tab === "prospectSegment") {
      const base = DEFAULT_SEGMENTS[item.value] || DEFAULT_SEGMENTS.other;
      const saved = (item.meta?.copy || {}) as Partial<SegmentCopy>;
      return Object.fromEntries(SEGMENT_FIELDS.map((field) => [field.key, saved[field.key] || base[field.key]]));
    }
    const texts = tab === "prospectGoal" ? goalTexts({ metaOf: metaOf(options) }, item.value) : opportunityTexts({ metaOf: metaOf(options) }, item.value);
    return { ...texts };
  };
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setValues(initial()), [item._id]);

  const fields =
    tab === "prospectSegment"
      ? SEGMENT_FIELDS.map((field) => ({ key: field.key, label: field.label, hint: field.hint }))
      : STYLES.map((style) => ({ key: style.id, label: style.label, hint: style.hint }));
  const metaKey = tab === "prospectSegment" ? "copy" : tab === "prospectGoal" ? "cta" : "messages";

  async function save(meta: Record<string, unknown>, message: string) {
    setBusy(true);
    setStatus("");
    try {
      upsertOption(await resources.options.update(item._id, { meta }));
      setStatus(message);
    } catch (err) {
      setStatus(apiError(err, "Não foi possível salvar."));
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!(await confirmDialog({ title: "Voltar ao texto padrão?", message: "O texto que você escreveu para este item será substituído pelo padrão do sistema.", confirmLabel: "Restaurar" }))) return;
    const meta = { ...(item.meta || {}) };
    delete meta[metaKey];
    const none = { metaOf: () => undefined };
    const defaults =
      tab === "prospectSegment"
        ? { ...(DEFAULT_SEGMENTS[item.value] || DEFAULT_SEGMENTS.other) }
        : { ...(tab === "prospectGoal" ? goalTexts(none, item.value) : opportunityTexts(none, item.value)) };
    void save(meta, "Texto padrão restaurado.").then(() => setValues(defaults));
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-charcoal">{item.label}</h3>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary !py-1.5" disabled={busy} onClick={restore}>
            Restaurar padrão
          </button>
          <button
            type="button"
            className="btn-primary !py-1.5"
            disabled={busy}
            onClick={() => void save({ ...(item.meta || {}), [metaKey]: values }, "Mensagens salvas.")}
          >
            Salvar
          </button>
        </div>
      </div>
      <div className="grid gap-3">
        {fields.map((field) => (
          <label key={field.key} className="block">
            <span className="block text-[13px] font-semibold text-charcoal">{field.label}</span>
            <span className="mb-1 block text-xs text-charcoal/50">{field.hint}</span>
            <textarea
              className="input-search min-h-[64px] resize-y"
              value={values[field.key] || ""}
              onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
            />
          </label>
        ))}
      </div>
      {status ? <p className="mt-2 text-xs font-medium text-charcoal/60">{status}</p> : null}
      {tab !== "prospectSegment" && fieldsOf("prospecting").length ? (
        <p className="mt-2 text-xs text-charcoal/45">
          Campos personalizados: {fieldsOf("prospecting").map((field) => `{${field.key}}`).join(", ")}
        </p>
      ) : null}
    </section>
  );
}

export default function ProspectingSettingsPage() {
  const { optionsOf } = useWorkspace();
  const [tab, setTab] = useState<Tab>("prospectOpportunity");
  const info = TABS.find((item) => item.value === tab)!;
  const items = optionsOf(tab);

  return (
    <>
      <Head>
        <title>Mensagens da prospecção | Configurações | Noma</title>
      </Head>
      <SettingsHeader title="Mensagens da prospecção" description={info.description} />

      <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" className="inline-flex min-w-max gap-1 rounded-xl bg-beige p-1">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              onClick={() => setTab(item.value)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === item.value ? "bg-white text-charcoal shadow-soft" : "text-charcoal/55 hover:text-charcoal"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {items.map((item) => (
            <MessageCard key={item._id} item={item} />
          ))}
        </div>
        <aside className="space-y-4 self-start lg:sticky lg:top-20">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-charcoal">Itens da lista</h2>
            <p className="mb-3 mt-1 text-xs text-charcoal/55">Cadastre, renomeie ou reordene. Itens novos começam com um texto genérico.</p>
            <OptionListEditor key={tab} list={tab} />
          </section>
          <section className="card-muted p-5 text-xs leading-5 text-charcoal/65">
            <p className="mb-1 font-semibold text-charcoal">Variáveis disponíveis</p>
            <p>
              <code>{"{angulo}"}</code> o que o vídeo pode mostrar no segmento · <code>{"{empresa}"}</code> ·{" "}
              <code>{"{pessoa}"}</code> · <code>{"{produtora}"}</code> · <code>{"{oportunidade}"}</code>
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
