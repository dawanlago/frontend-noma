import { formatCurrencyBRL, parseCurrencyBRL } from "@/utils/format";
import { BLANK, buildContract, type ContractDocument, type ContractSection } from "./clauses";
import { currencyToWords } from "./numberToWords";
import { defaultData, PAYMENT_CONDITION_OPTIONS, type ContractData, type ContractParty } from "./model";

/**
 * Modelos próprios de contrato (Configurações → Modelos de contrato).
 * Sintaxe: "# " título, "## " seção, linha em branco separa parágrafos,
 * **negrito** e {{variavel}} preenchida com os dados do Gerador.
 */

export interface TemplateVariable {
  key: string;
  label: string;
}

const PARTY_FIELDS: { key: keyof ContractParty | "qualificacao"; label: string }[] = [
  { key: "qualificacao", label: "qualificação completa (nome, documento e endereço)" },
  { key: "name", label: "nome" },
  { key: "document", label: "CPF/CNPJ" },
  { key: "address", label: "endereço" },
  { key: "city", label: "cidade" },
  { key: "state", label: "estado" },
  { key: "representative", label: "representante" },
  { key: "email", label: "e-mail" },
];

const PARTY_KEYS: Record<string, string> = {
  qualificacao: "qualificacao",
  name: "nome",
  document: "documento",
  address: "endereco",
  city: "cidade",
  state: "estado",
  representative: "representante",
  email: "email",
};

export const TEMPLATE_VARIABLES: { group: string; items: TemplateVariable[] }[] = [
  {
    group: "Produtora (contratada)",
    items: PARTY_FIELDS.map((field) => ({ key: `contratada.${PARTY_KEYS[field.key]}`, label: field.label })),
  },
  {
    group: "Cliente (contratante)",
    items: PARTY_FIELDS.map((field) => ({ key: `contratante.${PARTY_KEYS[field.key]}`, label: field.label })),
  },
  {
    group: "Serviço",
    items: [
      { key: "servico.descricao", label: "descrição do serviço" },
      { key: "servico.entregaveis", label: "entregáveis" },
      { key: "captacao.data", label: "data da captação" },
      { key: "captacao.local", label: "local da captação" },
      { key: "entrega.prazo_dias", label: "prazo de entrega (dias)" },
      { key: "revisoes", label: "rodadas de revisão" },
      { key: "vigencia.meses", label: "vigência (meses)" },
      { key: "entregas_por_mes", label: "entregas por mês" },
    ],
  },
  {
    group: "Pagamento",
    items: [
      { key: "valor", label: "valor com extenso" },
      { key: "valor.numero", label: "valor (R$)" },
      { key: "pagamento.condicao", label: "condição de pagamento" },
      { key: "pagamento.vencimento", label: "vencimento / 1ª parcela" },
      { key: "vencimento.dia", label: "dia de vencimento mensal" },
    ],
  },
  {
    group: "Assinatura",
    items: [
      { key: "data.contrato", label: "data por extenso" },
      { key: "cidade.assinatura", label: "cidade/UF da assinatura" },
      { key: "foro", label: "foro/comarca" },
    ],
  },
];

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function text(value: string | undefined) {
  return (value || "").trim() || BLANK;
}

function shortDate(iso: string) {
  const [year, month, day] = (iso || "").slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : BLANK;
}

function longDate(iso: string) {
  const [year, month, day] = (iso || "").slice(0, 10).split("-");
  return year && month && day ? `${Number(day)} de ${MONTHS[Number(month) - 1]} de ${year}` : BLANK;
}

function qualification(party: ContractParty) {
  const parts = [
    `<b>${text(party.name)}</b>`,
    party.document.trim() ? `inscrito(a) no CPF/CNPJ sob o nº ${party.document.trim()}` : "",
    party.address.trim() ? `com endereço em ${party.address.trim()}${party.city.trim() ? `, ${party.city.trim()}/${party.state.trim()}` : ""}` : "",
    party.representative.trim() ? `neste ato representado(a) por ${party.representative.trim()}` : "",
  ].filter(Boolean);
  return parts.join(", ");
}

/** Valores de cada variável a partir dos dados preenchidos no Gerador. */
export function templateValues(data: ContractData): Record<string, string> {
  const values: Record<string, string> = {};
  const party = (prefix: string, value: ContractParty) => {
    values[`${prefix}.qualificacao`] = qualification(value);
    values[`${prefix}.nome`] = text(value.name);
    values[`${prefix}.documento`] = text(value.document);
    values[`${prefix}.endereco`] = text(value.address);
    values[`${prefix}.cidade`] = text(value.city);
    values[`${prefix}.estado`] = text(value.state);
    values[`${prefix}.representante`] = text(value.representative);
    values[`${prefix}.email`] = text(value.email);
  };
  party("contratada", data.me);
  party("contratante", data.other);
  const amount = parseCurrencyBRL(data.payment.amount || "");
  Object.assign(values, {
    "servico.descricao": text(data.scope.description),
    "servico.entregaveis": text(data.scope.deliverables),
    "captacao.data": shortDate(data.scope.captureDate),
    "captacao.local": text(data.scope.captureLocation),
    "entrega.prazo_dias": text(data.scope.deliveryDays),
    revisoes: text(data.scope.revisions),
    "vigencia.meses": text(data.scope.termMonths),
    entregas_por_mes: text(data.scope.deliveriesPerMonth),
    valor: amount ? `${formatCurrencyBRL(amount)} (${currencyToWords(amount)})` : `R$ ${BLANK}`,
    "valor.numero": amount ? formatCurrencyBRL(amount) : `R$ ${BLANK}`,
    "pagamento.condicao": PAYMENT_CONDITION_OPTIONS.find((item) => item.value === data.payment.condition)?.label || BLANK,
    "pagamento.vencimento": shortDate(data.payment.firstDueDate),
    "vencimento.dia": text(data.scope.dueDay),
    "data.contrato": longDate(data.signature.date),
    "cidade.assinatura": data.signature.city.trim() ? `${data.signature.city.trim()}/${data.signature.state.trim()}` : BLANK,
    foro: text(data.signature.forum),
  });
  return values;
}

function fill(line: string, values: Record<string, string>) {
  return line
    .replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (match, key: string) => values[key.toLowerCase()] ?? match)
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
}

/** Monta o documento do modelo próprio no mesmo formato do contrato gerado (prévia e PDF). */
export function buildFromTemplate(body: string, data: ContractData, fallbackTitle: string): ContractDocument {
  const values = templateValues(data);
  const preamble: string[] = [];
  const sections: ContractSection[] = [];
  let title = "";
  let current: ContractSection | null = null;

  const blocks = body.replace(/\r/g, "").split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trimEnd()).filter((line) => line.trim());
    let buffer: string[] = [];
    const flush = () => {
      if (!buffer.length) return;
      const paragraph = fill(buffer.join(" "), values);
      if (current) current.paragraphs.push(paragraph);
      else preamble.push(paragraph);
      buffer = [];
    };
    for (const line of lines) {
      if (line.startsWith("# ")) {
        flush();
        title = fill(line.slice(2).trim(), values).replace(/<\/?b>/g, "");
      } else if (line.startsWith("## ")) {
        flush();
        current = { heading: fill(line.slice(3).trim(), values).replace(/<\/?b>/g, ""), paragraphs: [] };
        sections.push(current);
      } else {
        buffer.push(line.trim());
      }
    }
    flush();
  }

  return {
    title: title || fallbackTitle,
    preamble,
    sections,
    closing: "",
    placeDate: `${values["cidade.assinatura"]}, ${values["data.contrato"]}.`,
    signers: [
      { role: "CONTRATANTE", name: data.other.name.trim(), document: data.other.document.trim() },
      { role: "CONTRATADA", name: data.me.name.trim(), document: data.me.document.trim() },
    ],
    witnesses: data.rules.signatures,
  };
}

/** Texto inicial de um modelo a partir do contrato de projeto do sistema, com as variáveis no lugar dos dados. */
export function systemContractAsTemplate(): string {
  const data = defaultData();
  const party = (prefix: string): ContractParty => ({
    name: `{{${prefix}.nome}}`,
    document: `{{${prefix}.documento}}`,
    address: `{{${prefix}.endereco}}`,
    city: `{{${prefix}.cidade}}`,
    state: `{{${prefix}.estado}}`,
    representative: "",
    email: `{{${prefix}.email}}`,
  });
  data.me = party("contratada");
  data.other = party("contratante");
  data.scope.description = "{{servico.descricao}}";
  data.scope.deliverables = "{{servico.entregaveis}}";
  data.scope.captureLocation = "{{captacao.local}}";
  data.scope.deliveryDays = "{{entrega.prazo_dias}}";
  data.scope.revisions = "{{revisoes}}";
  data.signature.forum = "{{foro}}";
  const doc = buildContract(data);
  const clean = (value: string) =>
    value
      .replace(/<b>/g, "**")
      .replace(/<\/b>/g, "**")
      .replace(/R\$ ________/g, "{{valor}}")
      .replace(/^\d+\.\d+\.\s/, "");
  return [
    `# ${doc.title}`,
    ...doc.preamble.map(clean),
    ...doc.sections.flatMap((section) => [`## ${section.heading.replace(/^\d+\.\s/, "")}`, ...section.paragraphs.map(clean)]),
    doc.closing,
  ].join("\n\n");
}
