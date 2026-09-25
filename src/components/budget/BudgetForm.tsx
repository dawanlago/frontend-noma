import OptionSelect from "@/components/options/OptionSelect";
import Field from "@/components/tools/Field";
import ToolSection from "@/components/tools/ToolSection";
import Select from "@/components/ui/Select";
import type { BudgetResult } from "@/lib/budget/calc";
import {
  MARGIN_OPTIONS,
  MARGIN_SHORTCUTS,
  OPERATIONAL_OPTIONS,
  type BudgetData,
} from "@/lib/budget/model";
import { formatCurrencyBRL } from "@/utils/format";
import ExternalCostsEditor from "./ExternalCostsEditor";
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
        active ? "border-tan bg-tan text-white" : "border-charcoal/10 bg-white text-charcoal hover:border-charcoal/25"
      }`}
    >
      {children}
    </button>
  );
}

/** Formulário da Calculadora de Orçamento (seções 01 a 05). */
export default function BudgetForm({ data, result, onChange }: BudgetFormProps) {
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

      <ToolSection step={2} title="Produção" description="Dias de gravação e o tempo que você dedica antes de ligar a câmera.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantidade de diárias">
            <NumberInput value={data.days} onChange={(days) => onChange({ days })} unit="diárias" />
          </Field>
          <Field label="Valor da diária (R$)">
            <CurrencyInput value={data.dailyRate} onChange={(dailyRate) => onChange({ dailyRate })} />
          </Field>
          <Field label="Horas de captação">
            <NumberInput value={data.shootingHours} onChange={(shootingHours) => onChange({ shootingHours })} unit="h" />
          </Field>
          <Field label="Horas de preparação" hint="Roteiro, visita técnica, organização de equipamento.">
            <NumberInput value={data.prepHours} onChange={(prepHours) => onChange({ prepHours })} unit="h" />
          </Field>
        </div>
        <Subtotal label="Custo de produção" formula="diárias × valor da diária" value={result.productionCost} />
      </ToolSection>

      <ToolSection step={3} title="Pós-produção" description="Edição, finalização e as rodadas de ajuste com o cliente.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantidade de vídeos">
            <NumberInput value={data.videos} onChange={(videos) => onChange({ videos })} decimal={false} unit="vídeos" />
          </Field>
          <Field label="Horas de edição por vídeo">
            <NumberInput value={data.editHoursPerVideo} onChange={(editHoursPerVideo) => onChange({ editHoursPerVideo })} unit="h" />
          </Field>
          <Field label="Valor da hora de edição (R$)">
            <CurrencyInput value={data.editHourlyRate} onChange={(editHourlyRate) => onChange({ editHourlyRate })} />
          </Field>
          <Field label="Horas de reunião/revisão" hint="Entram nas horas totais do projeto.">
            <NumberInput value={data.reviewHours} onChange={(reviewHours) => onChange({ reviewHours })} unit="h" />
          </Field>
        </div>
        <Subtotal
          label="Custo de pós-produção"
          formula="vídeos × horas por vídeo × valor da hora"
          value={result.postProductionCost}
        />
      </ToolSection>

      <ToolSection step={4} title="Custos externos" description="Tudo o que sai do seu bolso para o projeto acontecer.">
        <ExternalCostsEditor costs={data.externalCosts} onChange={(externalCosts) => onChange({ externalCosts })} />
      </ToolSection>

      <ToolSection step={5} title="Operação e margem" description="Custos fixos do seu negócio e o lucro que você quer ter.">
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
