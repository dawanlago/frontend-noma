import { useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import CustomFieldsInputs from "@/components/options/CustomFieldsInputs";
import OptionChips from "@/components/options/OptionChips";
import OptionSelect from "@/components/options/OptionSelect";
import CopyButton from "@/components/tools/CopyButton";
import Field from "@/components/tools/Field";
import OptionCards from "@/components/tools/OptionCards";
import SaveStatus from "@/components/tools/SaveStatus";
import ToolSection from "@/components/tools/ToolSection";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyName, useWorkspace } from "@/contexts/WorkspaceContext";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import {
  generateProspecting,
  prospectToClipboard,
  type BaseQuality,
  type ProspectMessage,
  type ProspectStep,
  type QualityChip,
} from "@/lib/prospecting/generate";
import { CHANNEL_OPTIONS, DEFAULT_PROSPECT, normalizeProspect, type ProspectForm } from "@/lib/prospecting/options";
import { confirmDialog } from "@/components/ui/DialogHost";

const qualityBox: Record<BaseQuality, string> = {
  good: "border-sage/25 bg-sage/[0.06]",
  generic: "border-gold/25 bg-gold/[0.06]",
  missing: "border-burgundy/20 bg-burgundy/[0.04]",
};

const qualityDot: Record<BaseQuality, string> = {
  good: "bg-sage",
  generic: "bg-gold",
  missing: "bg-burgundy",
};

const chipTone: Record<QualityChip["tone"], string> = {
  sage: "bg-sage/10 text-sage",
  gold: "bg-gold/10 text-gold",
  burgundy: "bg-burgundy/10 text-burgundy",
  tan: "bg-tan/10 text-tan",
};

export default function ProspectingPage() {
  const { user, can } = useAuth();
  const { labelOf, options, fieldsOf } = useWorkspace();
  const producer = useCompanyName();
  const [draft, setForm, reset] = useLocalDraft<ProspectForm>("prospecting", DEFAULT_PROSPECT);
  const form = useMemo(() => normalizeProspect(draft), [draft]);
  // Respostas dos campos personalizados, para as variáveis {chave} das mensagens.
  const customText = useMemo(
    () =>
      Object.fromEntries(
        fieldsOf("prospecting").map((field) => {
          const value = form.custom[field.key];
          const list = `field:${field._id}`;
          const text = Array.isArray(value) ? value.map((item) => labelOf(list, item)).join(", ") : value ? labelOf(list, value) : "";
          return [field.key, text];
        }),
      ),
    [fieldsOf, form.custom, labelOf],
  );
  const result = useMemo(
    () =>
      generateProspecting(form, {
        senderName: user?.name || "",
        producer,
        labelOf,
        metaOf: (list, value) => options.find((item) => item.list === list && item.value === value)?.meta,
        customText,
      }),
    [form, user?.name, producer, labelOf, options, customText],
  );

  function update(changes: Partial<ProspectForm>) {
    setForm((current) => ({ ...normalizeProspect(current), ...changes }));
  }

  const { assessment } = result;

  return (
    <>
      <Head>
        <title>Gerador de Prospecção | Noma</title>
      </Head>

      <PageHeader
        eyebrow="Ferramenta comercial"
        title="Gerador de Prospecção"
        description="Monte uma primeira abordagem que mostre que você realmente olhou para o negócio antes de oferecer o trabalho da produtora."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SaveStatus state="saved" local />
            {can("configuracoes") ? (
              <Link href="/configuracoes/prospeccao" className="btn-secondary">
                Editar mensagens
              </Link>
            ) : null}
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                if (await confirmDialog({ title: "Limpar e começar de novo?", message: "O que foi preenchido nesta prospecção será apagado.", confirmLabel: "Limpar", danger: true })) reset();
              }}
            >
              Limpar
            </button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <ToolSection step={1} title="Onde você vai abordar?" description="O canal muda o tamanho e o tom da mensagem.">
            <OptionCards
              value={form.channel}
              options={CHANNEL_OPTIONS}
              onChange={(channel) => update({ channel })}
              columns={4}
            />
          </ToolSection>

          <ToolSection step={2} title="Quem é esse possível cliente?">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome da empresa">
                <input
                  className="input-search"
                  value={form.company}
                  placeholder="Ex.: Studio Pilates Leve"
                  onChange={(event) => update({ company: event.target.value })}
                />
              </Field>
              <Field label="Nome da pessoa" hint="Se souber. Deixa a mensagem bem mais pessoal.">
                <input
                  className="input-search"
                  value={form.person}
                  placeholder="Ex.: Carla"
                  onChange={(event) => update({ person: event.target.value })}
                />
              </Field>
              <Field label="Segmento">
                <OptionSelect list="prospectSegment" value={form.segment} onChange={(segment) => update({ segment })} />
              </Field>
              <Field label="Como encontrou?">
                <OptionSelect list="prospectSource" value={form.source} onChange={(source) => update({ source })} />
              </Field>
            </div>
          </ToolSection>

          <ToolSection
            step={3}
            title="O que você observou?"
            description="É isso que separa sua mensagem de mais uma oferta genérica."
          >
            <Field
              label="Observação real sobre a empresa"
              hint="Evite “gostei do perfil”. Cite algo concreto: um lançamento, um tipo de post, algo que falta, uma mudança recente."
            >
              <textarea
                className="input-search min-h-[110px] resize-y"
                value={form.observation}
                placeholder="Ex.: vocês abriram a segunda unidade mês passado, mas quase não aparece vídeo mostrando o espaço novo"
                onChange={(event) => update({ observation: event.target.value })}
              />
            </Field>
          </ToolSection>

          <ToolSection
            step={4}
            title="Qual oportunidade você enxergou?"
            description="Pode marcar mais de uma: a primeira marcada conduz a mensagem e as outras entram como complemento."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Oportunidades" full group>
                <OptionChips
                  list="prospectOpportunity"
                  value={form.opportunities}
                  onChange={(opportunities) => update({ opportunities })}
                />
              </Field>
              <Field label="Objetivo da primeira mensagem">
                <OptionSelect list="prospectGoal" value={form.goal} onChange={(goal) => update({ goal })} />
              </Field>
              <CustomFieldsInputs entity="prospecting" value={form.custom} onChange={(custom) => update({ custom })} />
              <Field label="Ideia que gostaria de apresentar" hint="Opcional." full>
                <textarea
                  className="input-search min-h-[80px] resize-y"
                  value={form.idea}
                  placeholder="Ex.: uma série curta mostrando os bastidores das aulas da manhã"
                  onChange={(event) => update({ idea: event.target.value })}
                />
              </Field>
            </div>
          </ToolSection>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="card p-5 sm:p-6">
              <h2 className="text-base font-semibold text-charcoal">Evite isso</h2>
              <ul className="mt-3 space-y-2.5">
                {result.avoid.map((tip) => (
                  <li key={tip} className="flex gap-2.5 text-sm leading-6 text-charcoal/65">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-burgundy/60" aria-hidden />
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
            <section className="card p-5 sm:p-6">
              <h2 className="text-base font-semibold text-charcoal">O que fazer depois</h2>
              <p className="mt-3 text-sm leading-6 text-charcoal/65">{result.next}</p>
            </section>
          </div>

          <SequenceCard steps={result.sequence} />
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-2">
          <section className={`rounded-xl border p-5 ${qualityBox[assessment.quality]}`}>
            <p className="eyebrow">Antes de enviar</p>
            <h2 className="mt-2 flex items-center gap-2 text-base font-semibold text-charcoal">
              <span className={`h-2 w-2 rounded-full ${qualityDot[assessment.quality]}`} aria-hidden />
              {assessment.title}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-charcoal/65">{assessment.text}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {assessment.chips.map((chip) => (
                <span key={chip.label} className={`chip ${chipTone[chip.tone]}`}>
                  {chip.label}
                </span>
              ))}
            </div>
          </section>

          {result.messages.map((message) => (
            <MessageCard key={message.id} message={message} />
          ))}

          <p className="px-1 text-xs leading-5 text-charcoal/50">
            Sem IA: as mensagens são modelos combinados com o que você preenche. Revise e ajuste ao seu jeito de falar.
          </p>
        </aside>
      </div>
    </>
  );
}

function MessageCard({ message }: { message: ProspectMessage }) {
  return (
    <section className="card p-5">
      <h3 className="text-sm font-semibold text-charcoal">{message.label}</h3>
      <p className="text-xs text-charcoal/50">{message.hint}</p>

      {message.subject ? (
        <div className="mt-3 rounded-lg border border-charcoal/[0.08] px-3 py-2 text-sm">
          <span className="text-charcoal/50">Assunto: </span>
          <span className="font-medium text-charcoal">{message.subject}</span>
        </div>
      ) : null}

      <p className="card-muted mt-3 whitespace-pre-line px-4 py-3 text-sm leading-6 text-charcoal">{message.text}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton text={() => prospectToClipboard(message)} className="btn-primary !py-2" />
        {message.subject ? (
          <CopyButton text={message.subject} label="Copiar assunto" className="btn-secondary !py-2" />
        ) : null}
      </div>
    </section>
  );
}

function SequenceCard({ steps }: { steps: ProspectStep[] }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-semibold text-charcoal">Sequência sugerida</h2>
      <p className="mt-1 text-sm text-charcoal/55">Até três tentativas, cada uma com um motivo novo.</p>
      <ol className="mt-5">
        {steps.map((step, index) => (
          <li key={step.title} className="relative flex gap-4 pb-5 last:pb-0">
            {index < steps.length - 1 ? (
              <span className="absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px bg-charcoal/10" aria-hidden />
            ) : null}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tan/10 text-xs font-bold text-tan">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="eyebrow !text-charcoal/45">{step.when}</p>
              <p className="mt-0.5 text-sm font-semibold text-charcoal">{step.title}</p>
              <p className="text-sm text-charcoal/60">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
