import { useMemo, useState } from "react";
import Head from "next/head";
import OptionSelect from "@/components/options/OptionSelect";
import CopyButton from "@/components/tools/CopyButton";
import Field from "@/components/tools/Field";
import OptionCards from "@/components/tools/OptionCards";
import SaveStatus from "@/components/tools/SaveStatus";
import ToolSection from "@/components/tools/ToolSection";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyName, useWorkspace } from "@/contexts/WorkspaceContext";
import { useToolDocument } from "@/hooks/useToolDocument";
import { briefingsApi } from "@/lib/briefing/api";
import { briefingPrintCss, briefingToHtml, briefingToText, buildBriefing } from "@/lib/briefing/format";
import { defaultData, normalize, titleOf, type BriefingData } from "@/lib/briefing/model";
import { BRIEFING_TEMPLATES, BRIEFING_TYPES, type BriefingField } from "@/lib/briefing/templates";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import { printDocument } from "@/utils/document";
import BriefingPreview from "./BriefingPreview";

interface BriefingEditorProps {
  id: string;
  onBack: () => void;
  onDuplicate: () => Promise<void>;
  onDelete: () => Promise<void>;
}

const TYPE_OPTIONS = BRIEFING_TYPES.map((type) => ({
  value: type,
  title: BRIEFING_TEMPLATES[type].title,
  description: BRIEFING_TEMPLATES[type].description,
}));

const toOptions = (values: string[]) => values.map((value) => ({ value, label: value }));

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      className="input-search"
      type={type}
      min={type === "number" ? 0 : undefined}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      className="input-search resize-y"
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function DynamicField({ field, value, onChange }: { field: BriefingField; value: string; onChange: (value: string) => void }) {
  if (field.kind === "textarea") {
    return <TextArea value={value} onChange={onChange} placeholder={field.placeholder} rows={field.key === "questions" ? 5 : 3} />;
  }
  if (field.kind === "select" && field.optionList) {
    return <OptionSelect list={field.optionList} value={value} onChange={onChange} />;
  }
  if (field.kind === "select") {
    return <Select value={value} onChange={onChange} options={toOptions(field.options || [])} placeholder="Selecione" />;
  }
  return <Input value={value} onChange={onChange} placeholder={field.placeholder} type={field.kind} />;
}

/** Cor do PDF: escolher entre as cores da identidade ou qualquer outra, e marcar a padrão. */
function StylePicker({ data, onChange }: { data: BriefingData; onChange: (style: Partial<BriefingData["style"]>) => void }) {
  const { can } = useAuth();
  const { settings, setSettings } = useWorkspace();
  const [status, setStatus] = useState("");
  const brand = settings?.brand;
  const colors = brand?.colors || [];
  const current = (data.style.color || brand?.defaultColor || "#111111").toUpperCase();
  const isDefault = current === (brand?.defaultColor || "").toUpperCase();

  async function makeDefault() {
    if (!brand) return;
    setStatus("");
    try {
      const known = colors.some((color) => color.hex.toUpperCase() === current);
      const saved = await resources.settings.update({
        brand: { ...brand, defaultColor: current, colors: known ? colors : [...colors, { name: "Cor personalizada", hex: current }] },
      });
      setSettings(saved);
      setStatus("Cor padrão atualizada.");
    } catch (err) {
      setStatus(apiError(err, "Não foi possível salvar a cor padrão."));
    }
  }

  return (
    <section className="card p-4">
      <p className="text-sm font-semibold text-charcoal">Identidade do PDF</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {colors.map((color) => {
          const active = color.hex.toUpperCase() === current;
          return (
            <button
              key={color.hex}
              type="button"
              title={`${color.name}${color.hex.toUpperCase() === brand?.defaultColor.toUpperCase() ? " (padrão)" : ""}`}
              aria-label={color.name}
              onClick={() => onChange({ color: color.hex })}
              className={`h-8 w-8 rounded-full border border-charcoal/15 ${active ? "ring-2 ring-tan ring-offset-2" : ""}`}
              style={{ backgroundColor: color.hex }}
            />
          );
        })}
        <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-charcoal/25 px-2.5 text-xs font-semibold text-charcoal/60">
          Outra cor
          <input type="color" className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" value={current} onChange={(e) => onChange({ color: e.target.value.toUpperCase() })} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-charcoal/55">{isDefault ? "Esta é a cor padrão." : `Cor atual: ${current}`}</span>
        {!isDefault && can("configuracoes") ? (
          <button type="button" className="font-semibold text-tan hover:underline" onClick={() => void makeDefault()}>
            Marcar como padrão
          </button>
        ) : null}
      </div>
      {brand?.logo ? (
        <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-charcoal/70">
          <input type="checkbox" checked={data.style.showLogo} onChange={(e) => onChange({ showLogo: e.target.checked })} />
          Incluir o logo da produtora no PDF
        </label>
      ) : can("configuracoes") ? (
        <p className="mt-3 text-xs text-charcoal/50">Envie o logo em Configurações → Geral e identidade visual.</p>
      ) : null}
      {status ? <p className="mt-2 text-xs text-charcoal/60">{status}</p> : null}
    </section>
  );
}

export default function BriefingEditor({ id, onBack, onDuplicate, onDelete }: BriefingEditorProps) {
  const { user } = useAuth();
  const { settings } = useWorkspace();
  const companyName = useCompanyName();
  const { data, setData, isLoading, error, saveState, ownerName, flush } = useToolDocument<BriefingData>({
    api: briefingsApi,
    id,
    normalize,
    titleOf,
  });
  const [busy, setBusy] = useState(false);
  const summary = useMemo(() => (data ? buildBriefing(data) : null), [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-24" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="skeleton h-[520px]" />
          <div className="skeleton h-[520px]" />
        </div>
      </div>
    );
  }

  if (error || !data || !summary) {
    return (
      <div className="card p-6">
        <p className="text-sm text-burgundy">{error || "Briefing não encontrado."}</p>
        <button type="button" className="btn-secondary mt-4" onClick={onBack}>
          ← Meus briefings
        </button>
      </div>
    );
  }

  const template = BRIEFING_TEMPLATES[data.type];
  const specific = data.specific[data.type];
  const showOwner = user?.role === "admin" && ownerName && ownerName !== user.name;

  const patch = <K extends "client" | "goal" | "creative" | "delivery" | "production" | "style">(key: K, value: Partial<BriefingData[K]>) =>
    setData((current) => ({ ...current, [key]: { ...current[key], ...value } }));
  const setSpecific = (key: string, value: string) =>
    setData((current) => ({
      ...current,
      specific: { ...current.specific, [current.type]: { ...current.specific[current.type], [key]: value } },
    }));

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await flush();
      await action();
    } finally {
      setBusy(false);
    }
  }

  function handleClear() {
    if (!window.confirm("Limpar o briefing e voltar aos valores padrão? Os dados preenchidos serão perdidos.")) return;
    setData(defaultData());
  }

  const color = data.style.color || settings?.brand.defaultColor || "#111111";

  function handlePrint() {
    if (!summary || !data) return;
    const brand = { color, logo: data.style.showLogo ? settings?.brand.logo || "" : "", companyName };
    printDocument(`Briefing — ${titleOf(data)}`, briefingToHtml(summary, brand), briefingPrintCss(color));
  }

  return (
    <>
      <Head>
        <title>{`Briefing — ${titleOf(data)} | Noma`}</title>
      </Head>
      <PageHeader
        eyebrow="Ferramenta de pré-produção"
        title="Gerador de Briefing"
        description="Uso interno: preencha durante ou depois da reunião com o cliente."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SaveStatus state={saveState} />
            {showOwner ? <span className="chip bg-gold/10 text-gold">Documento de {ownerName}</span> : null}
            <button type="button" className="btn-secondary" onClick={() => void run(async () => onBack())}>
              ← Meus briefings
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-6">
          <ToolSection step={1} title="Qual é o tipo de projeto?" description="As perguntas da etapa 4 mudam conforme o tipo. O que você já digitou em outro tipo fica guardado.">
            <OptionCards value={data.type} columns={3} options={TYPE_OPTIONS} onChange={(type) => setData((current) => ({ ...current, type }))} />
          </ToolSection>

          <ToolSection step={2} title="Cliente e projeto">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome do cliente *">
                <Input value={data.client.clientName} onChange={(clientName) => patch("client", { clientName })} placeholder="Empresa ou pessoa" />
              </Field>
              <Field label="Nome do projeto *">
                <Input value={data.client.projectName} onChange={(projectName) => patch("client", { projectName })} placeholder="Ex.: Reels de outubro" />
              </Field>
              <Field label="Contato responsável">
                <Input value={data.client.contact} onChange={(contact) => patch("client", { contact })} placeholder="Quem aprova e responde" />
              </Field>
              <Field label="WhatsApp / e-mail">
                <Input value={data.client.channel} onChange={(channel) => patch("client", { channel })} placeholder="(00) 00000-0000" />
              </Field>
            </div>
          </ToolSection>

          <ToolSection step={3} title="Objetivo">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Objetivo principal *" full>
                <TextArea
                  value={data.goal.mainGoal}
                  onChange={(mainGoal) => patch("goal", { mainGoal })}
                  placeholder="O que este projeto precisa resolver para o cliente?"
                />
              </Field>
              <Field label="Público que queremos atingir" full>
                <TextArea
                  value={data.goal.audience}
                  onChange={(audience) => patch("goal", { audience })}
                  placeholder="Quem vai assistir? Idade, interesses, momento de compra..."
                  rows={2}
                />
              </Field>
            </div>
          </ToolSection>

          <ToolSection step={4} title={template.sectionTitle} description={template.description}>
            <div className="grid gap-4 sm:grid-cols-2">
              {template.fields.map((field) => (
                <Field key={`${data.type}-${field.key}`} label={field.label} full={field.full}>
                  <DynamicField field={field} value={specific[field.key] || ""} onChange={(value) => setSpecific(field.key, value)} />
                </Field>
              ))}
            </div>
          </ToolSection>

          <ToolSection step={5} title="Produção" description="Informações da gravação para a equipe.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data da gravação">
                <Input type="date" value={data.production.date} onChange={(date) => patch("production", { date })} />
              </Field>
              <Field label="Horário">
                <Input value={data.production.time} onChange={(time) => patch("production", { time })} placeholder="Ex.: 8h às 12h (chegada 7h30)" />
              </Field>
              <Field label="Local" full>
                <Input value={data.production.location} onChange={(location) => patch("production", { location })} placeholder="Endereço completo e ponto de referência" />
              </Field>
              <Field label="Informações da gravação" full>
                <TextArea
                  value={data.production.notes}
                  onChange={(notes) => patch("production", { notes })}
                  placeholder="Equipe, equipamentos, figurino, estacionamento, contato no local, autorizações..."
                />
              </Field>
            </div>
          </ToolSection>

          <ToolSection step={6} title="Direção criativa">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Referências" full hint="Links, perfis ou vídeos que o cliente gosta.">
                <TextArea value={data.creative.references} onChange={(references) => patch("creative", { references })} placeholder="Cole links ou descreva as referências" />
              </Field>
              <Field label="O que devemos evitar?" full>
                <TextArea value={data.creative.avoid} onChange={(avoid) => patch("creative", { avoid })} placeholder="Cores, estilos, falas ou temas que não podem aparecer" rows={2} />
              </Field>
              <Field label="Observações importantes" full>
                <TextArea value={data.creative.notes} onChange={(notes) => patch("creative", { notes })} placeholder="Restrições de horário, pessoas-chave, cuidados no local..." rows={2} />
              </Field>
            </div>
          </ToolSection>

          <ToolSection step={7} title="Entrega">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Formato principal">
                <OptionSelect list="briefingFormat" value={data.delivery.format} onChange={(format) => patch("delivery", { format })} />
              </Field>
              <Field label="Prazo final">
                <Input type="date" value={data.delivery.deadline} onChange={(deadline) => patch("delivery", { deadline })} />
              </Field>
              <Field label="Número de revisões">
                <OptionSelect list="briefingRevisions" value={data.delivery.revisions} onChange={(revisions) => patch("delivery", { revisions })} />
              </Field>
              <Field label="Canal de publicação">
                <OptionSelect list="briefingChannel" value={data.delivery.channel} onChange={(channel) => patch("delivery", { channel })} />
              </Field>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 sm:col-span-2 ${
                  data.delivery.portfolio ? "border-tan/40 bg-tan/[0.04]" : "border-charcoal/10"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(210,98%,48%)]"
                  checked={data.delivery.portfolio}
                  onChange={(event) => patch("delivery", { portfolio: event.target.checked })}
                />
                <span>
                  <span className="block text-sm font-semibold text-charcoal">Incluir autorização de uso em portfólio</span>
                  <span className="mt-0.5 block text-[13px] text-charcoal/55">
                    O briefing sinaliza “Confirmar autorização” para você alinhar com o cliente antes de publicar.
                  </span>
                </span>
              </label>
            </div>
          </ToolSection>
        </div>

        <aside className="min-w-0 space-y-3 self-start lg:sticky lg:top-20">
          <StylePicker data={data} onChange={(style) => patch("style", style)} />
          <BriefingPreview summary={summary} color={color} />
          <div className="grid grid-cols-2 gap-2">
            <CopyButton text={() => briefingToText(summary)} label="Copiar briefing" className="btn-secondary" />
            <button type="button" className="btn-primary" onClick={handlePrint}>
              Gerar / imprimir PDF
            </button>
          </div>
          <button type="button" className="w-full text-center text-sm font-semibold text-charcoal/50 hover:text-burgundy" onClick={handleClear}>
            Limpar
          </button>
        </aside>
      </div>
    </>
  );
}
