import { useEffect, useMemo, useState, type ReactNode } from "react";
import Head from "next/head";
import Link from "next/link";
import CopyButton from "@/components/tools/CopyButton";
import Field from "@/components/tools/Field";
import OptionCards from "@/components/tools/OptionCards";
import SaveStatus from "@/components/tools/SaveStatus";
import ToolSection from "@/components/tools/ToolSection";
import MoneyInput from "@/components/ui/MoneyInput";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useToolDocument } from "@/hooks/useToolDocument";
import { contractsApi } from "@/lib/contracts/api";
import { buildContract, contractToHtml, contractToText, CONTRACT_PRINT_CSS } from "@/lib/contracts/clauses";
import { buildFromTemplate } from "@/lib/contracts/template";
import { resources } from "@/lib/resources";
import type { ContractTemplate } from "@/types";
import {
  CONTRACT_TYPE_LABELS,
  CONTRACT_TYPE_OPTIONS,
  PAYMENT_CONDITION_OPTIONS,
  defaultData,
  normalize,
  partyRoles,
  rulesForType,
  titleOf,
  type ContractData,
  type ContractParty,
  type ContractPayment,
  type ContractRules,
  type ContractScope,
  type ContractSignature,
  type PaymentCondition,
} from "@/lib/contracts/model";
import { printDocument } from "@/utils/document";
import ContractPreview from "./ContractPreview";
import LogoUpload from "./LogoUpload";
import PartyFields from "./PartyFields";
import { confirmDialog } from "@/components/ui/DialogHost";

interface ContractEditorProps {
  id: string;
  onBack: () => void;
  onDuplicate: () => Promise<void>;
  onDelete: () => Promise<void>;
}

const ROLE_HINTS: Record<string, string> = {
  CONTRATADA: "quem presta o serviço",
  CONTRATANTE: "quem contrata e paga pelo serviço",
  AUTORIZADA: "quem vai usar as imagens",
  AUTORIZANTE: "a pessoa filmada ou fotografada",
};

function Checkbox({
  checked,
  onChange,
  title,
  description,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition duration-150 ${
        checked ? "border-tan/40 bg-tan/[0.04]" : "border-charcoal/10 bg-white"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(210,98%,48%)]"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>
          <span className="block text-sm font-semibold text-charcoal">{title}</span>
          {description ? <span className="mt-0.5 block text-[13px] leading-5 text-charcoal/55">{description}</span> : null}
        </span>
      </label>
      {checked && children ? <div className="mt-3 pl-7">{children}</div> : null}
    </div>
  );
}

const textInput = (value: string, onChange: (value: string) => void, placeholder = "", type = "text") => (
  <input
    className="input-search"
    type={type}
    min={type === "number" ? 0 : undefined}
    value={value}
    placeholder={placeholder}
    onChange={(event) => onChange(event.target.value)}
  />
);

const textArea = (value: string, onChange: (value: string) => void, placeholder = "", rows = 3) => (
  <textarea
    className="input-search resize-y"
    rows={rows}
    value={value}
    placeholder={placeholder}
    onChange={(event) => onChange(event.target.value)}
  />
);

export default function ContractEditor({ id, onBack, onDuplicate, onDelete }: ContractEditorProps) {
  const { user, can } = useAuth();
  const [templates, setTemplates] = useState<ContractTemplate[] | null>(null);

  useEffect(() => {
    resources.contractTemplates
      .list()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);
  const { data, setData, isLoading, error, saveState, ownerName, flush } = useToolDocument<ContractData>({
    api: contractsApi,
    id,
    normalize,
    titleOf,
  });
  const [busy, setBusy] = useState(false);

  const template = useMemo(() => {
    if (!templates?.length || !data) return null;
    return templates.find((item) => item._id === data.templateId) || templates.find((item) => item.isDefault) || templates[0];
  }, [templates, data]);

  const doc = useMemo(() => {
    if (!data) return null;
    if (data.type === "custom") {
      return template
        ? buildFromTemplate(template.body, data, template.name.toUpperCase())
        : { ...buildContract({ ...data, type: "project" }), title: "Cadastre o contrato da produtora" };
    }
    return buildContract(data);
  }, [data, template]);

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

  if (error || !data || !doc) {
    return (
      <div className="card p-6">
        <p className="text-sm text-burgundy">{error || "Contrato não encontrado."}</p>
        <button type="button" className="btn-secondary mt-4" onClick={onBack}>
          ← Meus contratos
        </button>
      </div>
    );
  }

  const roles = partyRoles(data.type);
  const isCustom = data.type === "custom";
  const isImage = data.type === "image";
  const isRecurring = data.type === "recurring";
  const isOutsourcing = data.type === "outsourcing";
  const showOwner = user?.role === "admin" && ownerName && ownerName !== user.name;

  const patch = <K extends "me" | "other" | "scope" | "payment" | "rules" | "signature">(
    key: K,
    value: Partial<ContractData[K]>,
  ) => setData((current) => ({ ...current, [key]: { ...current[key], ...value } }));
  const scope = (key: keyof ContractScope) => (value: string) => patch("scope", { [key]: value } as Partial<ContractScope>);
  const signature = (value: Partial<ContractSignature>) => patch("signature", value);
  const payment = (value: Partial<ContractPayment>) => patch("payment", value);
  const rules = (value: Partial<ContractRules>) => patch("rules", value);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await flush();
      await action();
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    if (!(await confirmDialog({ title: "Limpar o contrato?", message: "Tudo volta aos valores padrão e os dados preenchidos serão perdidos.", confirmLabel: "Limpar", danger: true }))) return;
    setData(defaultData());
  }

  function handlePrint() {
    if (!doc || !data) return;
    printDocument(titleOf(data), contractToHtml(doc, data.logo), CONTRACT_PRINT_CSS);
  }

  const amountLabel = isRecurring ? "Valor mensal" : isImage ? "Valor da cessão" : "Valor total";
  const showPayment = !isImage || data.payment.imagePaid;

  return (
    <>
      <Head>
        <title>{`${titleOf(data)} | Noma`}</title>
      </Head>
      <PageHeader
        eyebrow="Ferramenta operacional"
        title="Gerador de Contratos"
        description="Preencha os dados e o contrato é montado ao lado, com as cláusulas numeradas automaticamente."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SaveStatus state={saveState} />
            {showOwner ? <span className="chip bg-gold/10 text-gold">Documento de {ownerName}</span> : null}
            <button type="button" className="btn-secondary" onClick={() => void run(async () => onBack())}>
              ← Meus contratos
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

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/[0.07] px-4 py-3 text-sm text-charcoal">
        <span aria-hidden className="mt-0.5 font-bold text-gold">!</span>
        <p>
          <strong>Modelo-base operacional.</strong> Revise com um advogado antes de usar comercialmente.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-6">
          <ToolSection step={1} title="Tipo de contrato" description="As cláusulas e os campos mudam conforme o tipo escolhido.">
            <OptionCards
              value={data.type}
              columns={2}
              options={CONTRACT_TYPE_OPTIONS}
              onChange={(type) => setData((current) => ({ ...current, type }))}
            />
            {isCustom ? (
              <div className="mt-4 rounded-xl border border-charcoal/10 p-4">
                {templates === null ? (
                  <div className="skeleton h-10" />
                ) : templates.length ? (
                  <Field label="Modelo" hint="O texto do modelo é editado em Configurações → Modelos de contrato.">
                    <Select
                      value={template?._id || ""}
                      onChange={(templateId) => setData((current) => ({ ...current, templateId }))}
                      options={templates.map((item) => ({ value: item._id, label: `${item.name}${item.isDefault ? " (padrão)" : ""}` }))}
                    />
                  </Field>
                ) : (
                  <p className="text-sm text-charcoal/65">
                    Nenhum modelo cadastrado ainda.{" "}
                    {can("configuracoes") ? (
                      <Link href="/configuracoes/contratos" className="font-semibold text-tan hover:underline">
                        Cadastrar o contrato da produtora
                      </Link>
                    ) : (
                      "Peça a um administrador para cadastrar o contrato da produtora."
                    )}
                  </p>
                )}
              </div>
            ) : null}
          </ToolSection>

          <ToolSection
            step={2}
            title="Seus dados"
            description={`Neste documento você aparece como ${roles.me} (${ROLE_HINTS[roles.me]}).`}
          >
            <LogoUpload value={data.logo} onChange={(logo) => setData((current) => ({ ...current, logo }))} />
            <PartyFields value={data.me} onChange={(value: Partial<ContractParty>) => patch("me", value)} />
          </ToolSection>

          <ToolSection
            step={3}
            title="Outra parte"
            description={`A outra parte aparece como ${roles.other} (${ROLE_HINTS[roles.other]}).`}
          >
            <PartyFields value={data.other} onChange={(value: Partial<ContractParty>) => patch("other", value)} />
          </ToolSection>

          <ToolSection
            step={4}
            title="Escopo"
            description={isImage ? "O que será captado e como as imagens poderão ser usadas." : "O que será entregue, quando e onde."}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={isImage ? "Projeto / produção" : isOutsourcing ? "Descrição do serviço contratado" : "Descrição do serviço"} full>
                {textArea(
                  data.scope.description,
                  scope("description"),
                  isImage ? "Ex.: gravação do vídeo institucional da empresa X" : "Ex.: produção de vídeos para redes sociais",
                )}
              </Field>
              {isImage ? (
                <Field label="Finalidade e mídias" full hint="Onde e para que as imagens poderão ser usadas.">
                  {textArea(data.scope.imagePurpose, scope("imagePurpose"), "Ex.: redes sociais, site, anúncios digitais")}
                </Field>
              ) : (
                <Field label={isRecurring ? "Padrão de entrega mensal" : "Entregáveis"} full>
                  {textArea(data.scope.deliverables, scope("deliverables"), "Ex.: 4 vídeos verticais de até 60 segundos")}
                </Field>
              )}
              {isOutsourcing ? (
                <Field label="Cliente final (opcional)" full hint="Para quem o job está sendo feito. Ativa a cláusula de não abordagem.">
                  {textInput(data.scope.endClient, scope("endClient"), "Nome do cliente final")}
                </Field>
              ) : null}
              <Field label={isRecurring ? "Data da primeira captação" : "Data da captação"}>
                {textInput(data.scope.captureDate, scope("captureDate"), "", "date")}
              </Field>
              <Field label="Local da captação">
                {textInput(data.scope.captureLocation, scope("captureLocation"), "Endereço ou nome do local")}
              </Field>
              {isImage ? (
                <>
                  <Field label="Território">{textInput(data.scope.imageTerritory, scope("imageTerritory"), "Ex.: território nacional e internet")}</Field>
                  <Field label="Prazo de uso (meses)">{textInput(data.scope.imageTermMonths, scope("imageTermMonths"), "24", "number")}</Field>
                </>
              ) : (
                <>
                  <Field label={isRecurring ? "Prazo de entrega após cada captação (dias)" : "Prazo de entrega após captação (dias)"}>
                    {textInput(data.scope.deliveryDays, scope("deliveryDays"), "10", "number")}
                  </Field>
                  <Field label="Rodadas de revisão incluídas">{textInput(data.scope.revisions, scope("revisions"), "2", "number")}</Field>
                </>
              )}
              {isRecurring ? (
                <>
                  <Field label="Vigência (meses)">{textInput(data.scope.termMonths, scope("termMonths"), "6", "number")}</Field>
                  <Field label="Dia de vencimento mensal">{textInput(data.scope.dueDay, scope("dueDay"), "10", "number")}</Field>
                  <Field label="Entregas por mês">{textInput(data.scope.deliveriesPerMonth, scope("deliveriesPerMonth"), "8", "number")}</Field>
                  <Field label="Aviso prévio de rescisão (dias)">{textInput(data.scope.noticeDays, scope("noticeDays"), "30", "number")}</Field>
                </>
              ) : null}
            </div>
          </ToolSection>

          <ToolSection step={5} title="Prazo e pagamento">
            <div className="grid gap-4 sm:grid-cols-2">
              {isImage ? (
                <Field label="Tipo de autorização" full>
                  <Select
                    value={data.payment.imagePaid ? "paid" : "free"}
                    onChange={(value) => payment({ imagePaid: value === "paid" })}
                    options={[
                      { value: "free", label: "Gratuita" },
                      { value: "paid", label: "Remunerada" },
                    ]}
                  />
                </Field>
              ) : null}
              {showPayment ? (
                <>
                  <Field label={amountLabel}>
                    <MoneyInput value={data.payment.amount} onChange={(amount) => payment({ amount })} />
                  </Field>
                  {!isRecurring ? (
                    <Field label="Condição">
                      <Select
                        value={data.payment.condition}
                        onChange={(value) => payment({ condition: value as PaymentCondition })}
                        options={PAYMENT_CONDITION_OPTIONS}
                      />
                    </Field>
                  ) : null}
                  <Field label={isRecurring ? "Vencimento da primeira mensalidade" : "Vencimento / primeira parcela"}>
                    {textInput(data.payment.firstDueDate, (firstDueDate) => payment({ firstDueDate }), "", "date")}
                  </Field>
                </>
              ) : (
                <p className="text-sm text-charcoal/55 sm:col-span-2">
                  Autorização gratuita: o termo deixa claro que nada é devido à pessoa pelo uso da imagem.
                </p>
              )}
            </div>
          </ToolSection>

          {isCustom ? (
            <ToolSection step={6} title="Assinaturas">
              <Checkbox
                checked={data.rules.signatures}
                onChange={(checked) => rules({ signatures: checked })}
                title="Incluir duas testemunhas"
                description="Adiciona as linhas de testemunhas ao final do contrato."
              />
            </ToolSection>
          ) : (
            <ToolSection step={6} title="Regras do trabalho" description="Ligue ou desligue cláusulas. Elas renumeram sozinhas no contrato.">
              <div className="grid gap-3 sm:grid-cols-2">
                {rulesForType(data.type).map((rule) => (
                  <Checkbox
                    key={rule.key}
                    checked={data.rules[rule.key]}
                    onChange={(checked) => rules({ [rule.key]: checked })}
                    title={rule.title}
                    description={rule.description}
                  >
                    {rule.key === "approval" ? (
                      <Field label="Prazo para aprovação (dias corridos)">
                        {textInput(data.rules.approvalDays, (approvalDays) => rules({ approvalDays }), "5", "number")}
                      </Field>
                    ) : rule.key === "reschedule" ? (
                      <Field label="Antecedência mínima (horas)">
                        {textInput(data.rules.rescheduleHours, (rescheduleHours) => rules({ rescheduleHours }), "48", "number")}
                      </Field>
                    ) : null}
                  </Checkbox>
                ))}
              </div>
            </ToolSection>
          )}

          <ToolSection step={7} title="Assinatura">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data do contrato">{textInput(data.signature.date, (date) => signature({ date }), "", "date")}</Field>
              <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3">
                <Field label="Cidade onde é firmado">{textInput(data.signature.city, (city) => signature({ city }), "Cidade")}</Field>
                <Field label="Estado">{textInput(data.signature.state, (state) => signature({ state }), "UF")}</Field>
              </div>
              <p className="rounded-lg bg-beige px-3.5 py-2.5 text-xs leading-5 text-charcoal/60 sm:col-span-2">
                A cidade de assinatura é independente do endereço das partes: use o local onde o contrato está sendo
                firmado.
              </p>
              <div className="sm:col-span-2">
                <Checkbox
                  checked={data.signature.forumEnabled}
                  onChange={(forumEnabled) => signature({ forumEnabled })}
                  title="Adicionar cláusula de foro"
                  description="Define a comarca onde eventuais disputas serão resolvidas."
                >
                  <Field label="Foro / Comarca">{textInput(data.signature.forum, (forum) => signature({ forum }), "Ex.: São Paulo/SP")}</Field>
                </Checkbox>
              </div>
            </div>
          </ToolSection>
        </div>

        <aside className="min-w-0 space-y-3 self-start lg:sticky lg:top-20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="eyebrow">Pré-visualização</p>
              <p className="text-sm font-semibold text-charcoal">{CONTRACT_TYPE_LABELS[data.type]}</p>
            </div>
            <span className="chip bg-tan/10 text-tan">{doc.sections.length} {isCustom ? "seções" : "cláusulas"}</span>
          </div>
          <ContractPreview doc={doc} logo={data.logo} />
          <div className="grid grid-cols-2 gap-2">
            <CopyButton text={() => contractToText(doc)} label="Copiar texto" className="btn-secondary" />
            <button type="button" className="btn-primary" onClick={handlePrint}>
              Salvar contrato em PDF
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
