import { useMemo } from "react";
import Head from "next/head";
import CopyButton from "@/components/tools/CopyButton";
import Field from "@/components/tools/Field";
import OptionCards from "@/components/tools/OptionCards";
import SaveStatus from "@/components/tools/SaveStatus";
import ToolSection from "@/components/tools/ToolSection";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import {
  generateFollowup,
  messageToClipboard,
  type FollowupMessage,
  type RecommendationTone,
  type SequenceStep,
} from "@/lib/followup/generate";
import {
  CHANNEL_OPTIONS,
  DEFAULT_FOLLOWUP,
  SITUATION_OPTIONS,
  TIMING_OPTIONS,
  type FollowupChannel,
  type FollowupForm,
  type FollowupTiming,
} from "@/lib/followup/options";

const toneStyles: Record<RecommendationTone, { box: string; chip: string }> = {
  now: { box: "border-sage/25 bg-sage/[0.06]", chip: "bg-sage/10 text-sage" },
  wait: { box: "border-gold/25 bg-gold/[0.06]", chip: "bg-gold/10 text-gold" },
  last: { box: "border-burgundy/20 bg-burgundy/[0.04]", chip: "bg-burgundy/10 text-burgundy" },
};

export default function FollowupPage() {
  const { user } = useAuth();
  const [form, setForm, reset] = useLocalDraft<FollowupForm>("followup", DEFAULT_FOLLOWUP);
  const result = useMemo(() => generateFollowup(form, user?.name || ""), [form, user?.name]);

  function update(changes: Partial<FollowupForm>) {
    setForm((current) => ({ ...current, ...changes }));
  }

  const tone = toneStyles[result.recommendation.tone];

  return (
    <>
      <Head>
        <title>Gerador de Follow-up | Noma</title>
      </Head>

      <PageHeader
        eyebrow="Ferramenta comercial"
        title="Gerador de Follow-up"
        description="Escolha o que aconteceu com o cliente e receba mensagens prontas para retomar a conversa sem repetir abordagem ou parecer insistente."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SaveStatus state="saved" local />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (window.confirm("Limpar o formulário e começar de novo?")) reset();
              }}
            >
              Limpar
            </button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <ToolSection step={1} title="O que aconteceu?" description="Escolha a situação mais parecida com a sua.">
            <OptionCards
              value={form.situation}
              options={SITUATION_OPTIONS}
              onChange={(situation) => update({ situation })}
            />
          </ToolSection>

          <ToolSection step={2} title="Contexto" description="Quanto mais você preencher, mais pessoal fica a mensagem.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Há quanto tempo?" hint="Desde a última mensagem ou conversa.">
                <Select
                  value={form.timing}
                  onChange={(value) => update({ timing: value as FollowupTiming })}
                  options={TIMING_OPTIONS}
                />
              </Field>
              <Field label="Canal">
                <Select
                  value={form.channel}
                  onChange={(value) => update({ channel: value as FollowupChannel })}
                  options={CHANNEL_OPTIONS}
                />
              </Field>
              <Field label="Nome do cliente">
                <input
                  className="input-search"
                  value={form.clientName}
                  placeholder="Ex.: Mariana"
                  onChange={(event) => update({ clientName: event.target.value })}
                />
              </Field>
              <Field label="Empresa">
                <input
                  className="input-search"
                  value={form.company}
                  placeholder="Ex.: Café Aurora"
                  onChange={(event) => update({ company: event.target.value })}
                />
              </Field>
              <Field label="Serviço/proposta apresentada" full>
                <input
                  className="input-search"
                  value={form.service}
                  placeholder="Ex.: vídeo institucional, pacote mensal de reels"
                  onChange={(event) => update({ service: event.target.value })}
                />
              </Field>
              <Field
                label="O que ficou combinado na última conversa?"
                hint="Opcional. Entra na mensagem como lembrete do combinado."
                full
              >
                <textarea
                  className="input-search min-h-[96px] resize-y"
                  value={form.agreed}
                  placeholder="Ex.: ela ia apresentar a proposta para o sócio até sexta"
                  onChange={(event) => update({ agreed: event.target.value })}
                />
              </Field>
            </div>
          </ToolSection>

          <SequenceCard steps={result.sequence} />
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-2">
          <section className={`rounded-xl border p-5 ${tone.box}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="eyebrow">Recomendação</p>
              <span className={`chip ${tone.chip}`}>{result.recommendation.timingLabel}</span>
            </div>
            <h2 className="mt-2 text-base font-semibold text-charcoal">{result.recommendation.title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-charcoal/65">{result.recommendation.text}</p>
          </section>

          {result.messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              recommended={message.id === result.recommendation.highlight}
            />
          ))}

          <p className="px-1 text-xs leading-5 text-charcoal/50">
            Sem IA: as mensagens são modelos combinados com o que você preenche. Revise antes de enviar.
          </p>
        </aside>
      </div>
    </>
  );
}

function MessageCard({ message, recommended }: { message: FollowupMessage; recommended: boolean }) {
  return (
    <section className={`card p-5 ${recommended ? "ring-2 ring-tan/20" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-charcoal">{message.label}</h3>
          <p className="text-xs text-charcoal/50">{message.hint}</p>
        </div>
        {recommended ? <span className="chip bg-tan/10 text-tan">Indicada agora</span> : null}
      </div>

      {message.subject ? (
        <div className="mt-3 rounded-lg border border-charcoal/[0.08] px-3 py-2 text-sm">
          <span className="text-charcoal/50">Assunto: </span>
          <span className="font-medium text-charcoal">{message.subject}</span>
        </div>
      ) : null}

      <p className="card-muted mt-3 whitespace-pre-line px-4 py-3 text-sm leading-6 text-charcoal">{message.text}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton text={() => messageToClipboard(message)} className="btn-primary !py-2" />
        {message.subject ? (
          <CopyButton text={message.subject} label="Copiar assunto" className="btn-secondary !py-2" />
        ) : null}
      </div>
    </section>
  );
}

function SequenceCard({ steps }: { steps: SequenceStep[] }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-semibold text-charcoal">Sequência sugerida</h2>
      <p className="mt-1 text-sm text-charcoal/55">Um roteiro para não sumir, nem insistir demais.</p>
      <ol className="mt-5 space-y-0">
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
