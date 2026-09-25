import Field from "@/components/tools/Field";
import OptionCards from "@/components/tools/OptionCards";
import MoneyInput from "@/components/ui/MoneyInput";
import Select from "@/components/ui/Select";
import {
  BILLING_OPTIONS,
  moneyFromInput,
  moneyInputValue,
  uid,
  type Billing,
  type InvestmentMode,
  type PackagesLayout,
  type ProposalPackage,
} from "@/lib/proposals/model";
import { AddButton, MoveControls, StringListEditor, TextArea, TextInput, move, type StepProps } from "./ui";

const MAX_PACKAGES = 6;

export default function InvestmentStep({ data, setData }: StepProps) {
  const investment = data.investment;
  const setInvestment = (patch: Partial<typeof investment>) =>
    setData((current) => ({ ...current, investment: { ...current.investment, ...patch } }));
  const setSingle = (patch: Partial<typeof investment.single>) =>
    setData((current) => ({
      ...current,
      investment: { ...current.investment, single: { ...current.investment.single, ...patch } },
    }));
  const setPackages = (updater: (list: ProposalPackage[]) => ProposalPackage[]) =>
    setData((current) => ({
      ...current,
      investment: { ...current.investment, packages: updater(current.investment.packages) },
    }));

  function addPackage() {
    setPackages((list) => [
      ...list,
      {
        id: uid(),
        name: `Plano ${String(list.length + 1).padStart(2, "0")}`,
        title: "",
        description: "",
        items: [""],
        value: "R$ 0,00",
        payment: "",
        note: "",
      },
    ]);
  }

  const single = investment.single;

  return (
    <div className="space-y-6">
      <OptionCards<InvestmentMode>
        value={investment.mode}
        onChange={(mode) => setInvestment({ mode })}
        options={[
          { value: "single", title: "Opção única", description: "Um serviço com um valor fechado." },
          { value: "packages", title: "Pacotes", description: "Duas ou mais opções para o cliente escolher." },
        ]}
      />

      {investment.mode === "single" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do serviço" full>
              <TextInput value={single.name} onChange={(name) => setSingle({ name })} />
            </Field>
            <Field label="Descrição" full>
              <TextArea
                value={single.description}
                onChange={(description) => setSingle({ description })}
                rows={2}
                placeholder="Resumo do que está incluso."
              />
            </Field>
            <Field label="Valor">
              <MoneyInput value={moneyInputValue(single.value)} onChange={(value) => setSingle({ value: moneyFromInput(value) })} />
            </Field>
            <Field label="Cobrança">
              <Select
                value={single.billing}
                onChange={(billing) => setSingle({ billing: billing as Billing })}
                options={BILLING_OPTIONS}
              />
            </Field>
            <Field label="Forma de pagamento">
              <TextInput value={single.payment} onChange={(payment) => setSingle({ payment })} placeholder="Ex.: Pix ou boleto, todo dia 10" />
            </Field>
            <Field label="Observação">
              <TextInput value={single.note} onChange={(note) => setSingle({ note })} placeholder="Ex.: Deslocamento incluso" />
            </Field>
          </div>
          <div>
            <span className="mb-2 block text-[13px] font-semibold text-charcoal">O que está incluso</span>
            <StringListEditor items={single.items} onChange={(items) => setSingle({ items })} addLabel="Adicionar item" />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <span className="mb-2 block text-[13px] font-semibold text-charcoal">Como mostrar os pacotes</span>
            <OptionCards<PackagesLayout>
              value={investment.packagesLayout}
              onChange={(packagesLayout) => setInvestment({ packagesLayout })}
              options={[
                { value: "grid", title: "Lado a lado", description: "Comparação em uma grade (até 3 por página)." },
                { value: "separate", title: "Uma página por pacote", description: "Mais espaço para detalhar cada opção." },
              ]}
            />
          </div>

          {investment.packages.map((pkg, index) => {
            const update = (patch: Partial<ProposalPackage>) =>
              setPackages((list) => list.map((current) => (current.id === pkg.id ? { ...current, ...patch } : current)));
            return (
              <div key={pkg.id} className="rounded-xl border border-charcoal/10 bg-beige/40 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="chip bg-tan/10 text-tan">Pacote {String(index + 1).padStart(2, "0")}</span>
                  <MoveControls
                    index={index}
                    length={investment.packages.length}
                    onMove={(to) => setPackages((list) => move(list, index, to))}
                    onRemove={
                      investment.packages.length > 1
                        ? () => setPackages((list) => list.filter((current) => current.id !== pkg.id))
                        : undefined
                    }
                    removeLabel="Remover pacote"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome do plano">
                    <TextInput value={pkg.name} onChange={(name) => update({ name })} placeholder="Plano 01" />
                  </Field>
                  <Field label="Título">
                    <TextInput value={pkg.title} onChange={(title) => update({ title })} placeholder="4 Reels" />
                  </Field>
                  <Field label="Descrição" full>
                    <TextInput value={pkg.description} onChange={(description) => update({ description })} />
                  </Field>
                  <Field label="Valor">
                    <MoneyInput value={moneyInputValue(pkg.value)} onChange={(value) => update({ value: moneyFromInput(value) })} />
                  </Field>
                  <Field label="Pagamento">
                    <TextInput value={pkg.payment} onChange={(payment) => update({ payment })} placeholder="Ex.: mensal, via Pix" />
                  </Field>
                  <Field label="Observação" full>
                    <TextInput value={pkg.note} onChange={(note) => update({ note })} placeholder="Opcional" />
                  </Field>
                </div>
                <div className="mt-4">
                  <span className="mb-2 block text-[13px] font-semibold text-charcoal">Itens do pacote</span>
                  <StringListEditor items={pkg.items} onChange={(items) => update({ items })} addLabel="Adicionar item" max={12} />
                </div>
              </div>
            );
          })}
          <AddButton onClick={addPackage} disabled={investment.packages.length >= MAX_PACKAGES}>
            Adicionar pacote
          </AddButton>
        </div>
      )}
    </div>
  );
}
