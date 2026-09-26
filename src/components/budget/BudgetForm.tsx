import type { ReactNode } from "react";
import { HiOutlineXMark } from "react-icons/hi2";
import OptionSelect from "@/components/options/OptionSelect";
import Field from "@/components/tools/Field";
import ToolSection from "@/components/tools/ToolSection";
import Select from "@/components/ui/Select";
import type { BudgetResult } from "@/lib/budget/calc";
import {
  FIXED_FIELDS,
  MARGIN_OPTIONS,
  MARGIN_SHORTCUTS,
  OPERATIONAL_OPTIONS,
  type BudgetData,
  type FixedFieldKey,
} from "@/lib/budget/model";
import { formatCurrencyBRL } from "@/utils/format";
import BudgetItemsEditor from "./BudgetItemsEditor";
import { CurrencyInput, NumberInput } from "./NumberInput";

interface BudgetFormProps {
  data: BudgetData;
  result: BudgetResult;
  onChange: (changes: Partial<BudgetData>) => void;
}

function Subtotal({ label, value, formula }: { label: string; value: number; formula: string }) {
  return (
    <div className="card-muted mt-4 flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-charcoal">{label}</p>
        <p className="text-xs text-charcoal/50">{formula}</p>
      </div>
      <p className="text-lg font-semibold tabular-nums text-charcoal">{formatCurrencyBRL(value)}</p>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition duration-150 ${
        active ? "border-tan bg-tan text-white" : "border-charcoal/10 bg-surface text-charcoal hover:border-charcoal/25"
      }`}
    >
      {children}
    </button>
  );
}

/** Campo fixo com botão para removê-lo deste orçamento. */
function RemovableField({
  label,
  hint,
  removeLabel,
  onRemove,
  children,
}: {
  label: string;
  hint?: string;
  /** Sem `removeLabel`, o campo não mostra o botão (faz parte de um grupo removido junto). */
  removeLabel?: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <Field label={label} hint={hint}>
        {children}
      </Field>
      {removeLabel ? (
        <button
          type="button"
          className="absolute -top-1 right-0 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium text-charcoal/40 transition hover:bg-burgundy/10 hover:text-burgundy"
          title={removeLabel}
          aria-label={removeLabel}
          onClick={onRemove}
        >
          <HiOutlineXMark className="h-3.5 w-3.5" /> Remover
        </button>
      ) : null}
    </div>
  );
}

/** Formulário da Calculadora de Orçamento (seções numeradas conforme os campos visíveis). */
export default function BudgetForm({ data, result, onChange }: BudgetFormProps) {
  const hidden = new Set(data.hiddenFields);
  const shows = (key: FixedFieldKey) => !hidden.has(key);
  const hide = (key: FixedFieldKey) => onChange({ hiddenFields: [...data.hiddenFields, key] });
  const restore = (key: FixedFieldKey) => onChange({ hiddenFields: data.hiddenFields.filter((item) => item !== key) });
  const removed = FIXED_FIELDS.filter((field) => hidden.has(field.key));
  const showProduction = shows("production") || shows("shootingHours") || shows("prepHours");
  const showPost = shows("postProduction") || shows("reviewHours");
  let step = 1;

  const marginOptions = MARGIN_OPTIONS.map((value) => ({ value: String(value), label: `${value}%` }));
  if (!MARGIN_OPTIONS.includes(data.marginPercent as (typeof MARGIN_OPTIONS)[number])) {
    marginOptions.push({ value: String(data.marginPercent), label: `${data.marginPercent}%` });
  }

  return (
    <div className="space-y-5">
      <ToolSection step={1} title="Tipo de trabalho" description="O que você vai produzir e como quer identificar este orçamento.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de projeto">
            <OptionSelect list="budgetProjectType" value={data.projectType} onChange={(projectType) => onChange({ projectType })} />
          </Field>
          <Field label="Nome do projeto" hint="Opcional. Se vazio, o tipo de projeto vira o título.">
            <input
              className="input-search"
              value={data.projectName}
              placeholder="Ex.: Lançamento coleção verão"
              onChange={(event) => onChange({ projectName: event.target.value })}
            />
          </Field>
        </div>
      </ToolSection>

      {showProduction ? (
        <ToolSection step={++step} title="Produção" description="Dias de gravação e o tempo que você dedica antes de ligar a câmera.">
          <div className="grid gap-4 sm:grid-cols-2">
            {shows("production") ? (
              <>
                <RemovableField
                  label="Quantidade de diárias"
                  removeLabel="Remover diárias (quantidade e valor)"
                  onRemove={() => hide("production")}
                >
                  <NumberInput value={data.days} onChange={(days) => onChange({ days })} unit="diárias" />
                </RemovableField>
                <Field label="Valor da diária (R$)">
                  <CurrencyInput value={data.dailyRate} onChange={(dailyRate) => onChange({ dailyRate })} />
                </Field>
              </>
            ) : null}
            {shows("shootingHours") ? (
              <RemovableField label="Horas de captação" removeLabel="Remover horas de captação" onRemove={() => hide("shootingHours")}>
                <NumberInput value={data.shootingHours} onChange={(shootingHours) => onChange({ shootingHours })} unit="h" />
              </RemovableField>
            ) : null}
            {shows("prepHours") ? (
              <RemovableField
                label="Horas de preparação"
                hint="Roteiro, visita técnica, organização de equipamento."
                removeLabel="Remover horas de preparação"
                onRemove={() => hide("prepHours")}
              >
                <NumberInput value={data.prepHours} onChange={(prepHours) => onChange({ prepHours })} unit="h" />
              </RemovableField>
            ) : null}
          </div>
          {shows("production") ? (
            <Subtotal label="Custo de produção" formula="diárias × valor da diária" value={result.productionCost} />
          ) : null}
        </ToolSection>
      ) : null}

      {showPost ? (
        <ToolSection step={++step} title="Pós-produção" description="Edição, finalização e as rodadas de ajuste com o cliente.">
          <div className="grid gap-4 sm:grid-cols-2">
            {shows("postProduction") ? (
              <>
                <RemovableField
                  label="Quantidade de vídeos"
                  removeLabel="Remover edição (vídeos, horas e valor da hora)"
                  onRemove={() => hide("postProduction")}
                >
                  <NumberInput value={data.videos} onChange={(videos) => onChange({ videos })} decimal={false} unit="vídeos" />
                </RemovableField>
                <Field label="Horas de edição por vídeo">
                  <NumberInput value={data.editHoursPerVideo} onChange={(editHoursPerVideo) => onChange({ editHoursPerVideo })} unit="h" />
                </Field>
                <Field label="Valor da hora de edição (R$)">
                  <CurrencyInput value={data.editHourlyRate} onChange={(editHourlyRate) => onChange({ editHourlyRate })} />
                </Field>
              </>
            ) : null}
            {shows("reviewHours") ? (
              <RemovableField
                label="Horas de reunião/revisão"
                hint="Entram nas horas totais do projeto."
                removeLabel="Remover horas de reunião/revisão"
                onRemove={() => hide("reviewHours")}
              >
                <NumberInput value={data.reviewHours} onChange={(reviewHours) => onChange({ reviewHours })} unit="h" />
              </RemovableField>
            ) : null}
          </div>
          {shows("postProduction") ? (
            <Subtotal
              label="Custo de pós-produção"
              formula="vídeos × horas por vídeo × valor da hora"
              value={result.postProductionCost}
            />
          ) : null}
        </ToolSection>
      ) : null}

      {removed.length ? (
        <div className="card-muted flex flex-wrap items-center gap-2 px-4 py-3">
          <span className="mr-1 text-sm text-charcoal/60">Campos removidos deste orçamento:</span>
          {removed.map((field) => (
            <button
              key={field.key}
              type="button"
              className="btn-secondary !px-3 !py-1.5 text-sm"
              title={`Voltar a usar: ${field.hint}`}
              onClick={() => restore(field.key)}
            >
              + {field.label}
            </button>
          ))}
        </div>
      ) : null}

      <ToolSection
        step={++step}
        title="Profissionais e custos"
        description="Equipe extra (assistente, fotógrafa, storymaker...) e tudo o que sai do seu bolso para o projeto acontecer."
      >
        <BudgetItemsEditor items={data.items} onChange={(items) => onChange({ items })} />
      </ToolSection>

      <ToolSection step={++step} title="Operação e margem" description="Custos fixos do seu negócio e o lucro que você quer ter.">
        <div className="space-y-5">
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-charcoal">Custos operacionais</p>
            <div className="flex flex-wrap gap-2">
              {OPERATIONAL_OPTIONS.map((value) => (
                <Pill key={value} active={data.operationalPercent === value} onClick={() => onChange({ operationalPercent: value })}>
                  {`${value}%`}
                </Pill>
              ))}
            </div>
            <p className="mt-1 text-xs text-charcoal/50">Software, energia, internet, desgaste de equipamento, impostos.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
            <Field label="Margem de lucro desejada">
              <Select
                value={String(data.marginPercent)}
                onChange={(value) => onChange({ marginPercent: Number(value) })}
                options={marginOptions}
              />
            </Field>
            <div>
              <span className="mb-1.5 block text-[13px] font-semibold text-charcoal">Atalhos</span>
              <div className="flex flex-wrap gap-2">
                {MARGIN_SHORTCUTS.map((value) => (
                  <Pill key={value} active={data.marginPercent === value} onClick={() => onChange({ marginPercent: value })}>
                    {`${value}%`}
                  </Pill>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ToolSection>
    </div>
  );
}
