import { todayISO } from "@/utils/format";

/** "custom" usa um modelo próprio da produtora (Configurações → Modelos de contrato). */
export type ContractType = "custom" | "project" | "recurring" | "outsourcing" | "image";
export type PaymentCondition = "cash" | "split" | "installments";

export interface ContractParty {
  name: string;
  document: string;
  address: string;
  city: string;
  state: string;
  representative: string;
  email: string;
}

export interface ContractScope {
  description: string;
  deliverables: string;
  captureDate: string;
  deliveryDays: string;
  revisions: string;
  captureLocation: string;
  /** Recorrente */
  termMonths: string;
  dueDay: string;
  deliveriesPerMonth: string;
  noticeDays: string;
  /** Terceirização */
  endClient: string;
  /** Uso de imagem */
  imagePurpose: string;
  imageTerritory: string;
  imageTermMonths: string;
}

export interface ContractPayment {
  amount: string;
  condition: PaymentCondition;
  firstDueDate: string;
  /** Uso de imagem: autorização remunerada? */
  imagePaid: boolean;
}

export type ContractRuleKey =
  | "lateFee"
  | "scopeControl"
  | "approval"
  | "reschedule"
  | "editableFiles"
  | "portfolio"
  | "confidentiality"
  | "dataProtection"
  | "signatures";

export interface ContractRules extends Record<ContractRuleKey, boolean> {
  approvalDays: string;
  rescheduleHours: string;
}

export interface ContractSignature {
  date: string;
  city: string;
  state: string;
  forumEnabled: boolean;
  forum: string;
}

export interface ContractData {
  type: ContractType;
  /** Modelo usado quando `type` é "custom" (vazio = modelo padrão). */
  templateId: string;
  logo: string;
  me: ContractParty;
  other: ContractParty;
  scope: ContractScope;
  payment: ContractPayment;
  rules: ContractRules;
  signature: ContractSignature;
}

export const CONTRACT_TYPE_OPTIONS: { value: ContractType; title: string; badge: string; description: string }[] = [
  {
    value: "custom",
    title: "Contrato da produtora",
    badge: "Modelo próprio",
    description: "Usa o contrato cadastrado em Configurações → Modelos de contrato, preenchendo os dados automaticamente.",
  },
  {
    value: "project",
    title: "Projeto fechado",
    badge: "Prestação pontual",
    description: "Vídeo institucional, evento, conteúdo avulso ou campanha com começo, meio e fim.",
  },
  {
    value: "recurring",
    title: "Contrato recorrente",
    badge: "Gerenciamento mensal",
    description: "Conteúdo mensal, gestão de redes e prestação continuada com mensalidade.",
  },
  {
    value: "outsourcing",
    title: "Terceirização",
    badge: "Serviço tomado",
    description: "Quando você contrata um editor, filmmaker, designer ou outro profissional para um job.",
  },
  {
    value: "image",
    title: "Autorização comercial",
    badge: "Direito de uso de imagem",
    description: "A pessoa filmada ou fotografada autoriza o uso da própria imagem em fotos e vídeos.",
  },
];

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  custom: "Contrato da produtora",
  project: "Projeto fechado",
  recurring: "Contrato recorrente",
  outsourcing: "Terceirização",
  image: "Autorização de uso de imagem",
};

export const PAYMENT_CONDITION_OPTIONS: { value: PaymentCondition; label: string }[] = [
  { value: "cash", label: "À vista" },
  { value: "split", label: "50% na contratação + 50% na entrega" },
  { value: "installments", label: "Parcelado conforme combinado" },
];

/** Papel de cada parte no documento, conforme o tipo. */
export function partyRoles(type: ContractType): { me: string; other: string } {
  if (type === "outsourcing") return { me: "CONTRATANTE", other: "CONTRATADA" };
  if (type === "image") return { me: "AUTORIZADA", other: "AUTORIZANTE" };
  return { me: "CONTRATADA", other: "CONTRATANTE" };
}

export const RULE_OPTIONS: { key: ContractRuleKey; title: string; description: string }[] = [
  {
    key: "lateFee",
    title: "Inadimplência",
    description: "Multa de 2%, juros de 1% ao mês e suspensão do serviço em caso de atraso no pagamento.",
  },
  {
    key: "scopeControl",
    title: "Controle de escopo",
    description: "Pedidos fora do combinado viram serviço adicional, orçado e aprovado à parte.",
  },
  {
    key: "approval",
    title: "Aprovação e revisões",
    description: "Limita as rodadas de ajuste e define prazo para aprovar; sem resposta, a versão é aprovada.",
  },
  {
    key: "reschedule",
    title: "Reagendamento e no-show",
    description: "Antecedência mínima para remarcar e taxa quando a captação não acontece por falta da outra parte.",
  },
  {
    key: "editableFiles",
    title: "Arquivos editáveis não incluídos",
    description: "Brutos e projetos de edição não fazem parte da entrega, salvo negociação à parte.",
  },
  {
    key: "portfolio",
    title: "Uso em portfólio",
    description: "Regras para exibir o trabalho no portfólio, site e redes de quem produziu.",
  },
  {
    key: "confidentiality",
    title: "Confidencialidade",
    description: "Sigilo sobre informações estratégicas, comerciais e sobre os valores do contrato.",
  },
  {
    key: "dataProtection",
    title: "Proteção de dados (LGPD)",
    description: "Dados pessoais e imagens tratados só para a execução do contrato, conforme a Lei 13.709/2018.",
  },
  {
    key: "signatures",
    title: "Assinaturas e testemunhas",
    description: "Inclui duas testemunhas, o que dá força de título executivo ao contrato.",
  },
];

const RULES_BY_TYPE: Record<ContractType, ContractRuleKey[]> = {
  custom: ["signatures"],
  project: RULE_OPTIONS.map((rule) => rule.key),
  recurring: RULE_OPTIONS.map((rule) => rule.key),
  outsourcing: RULE_OPTIONS.map((rule) => rule.key).filter((key) => key !== "editableFiles"),
  image: ["portfolio", "confidentiality", "dataProtection", "signatures"],
};

export function rulesForType(type: ContractType) {
  return RULE_OPTIONS.filter((rule) => RULES_BY_TYPE[type].includes(rule.key));
}

/** Regra ligada E aplicável ao tipo de contrato. */
export function ruleOn(data: ContractData, key: ContractRuleKey) {
  return RULES_BY_TYPE[data.type].includes(key) && Boolean(data.rules[key]);
}

function emptyParty(): ContractParty {
  return { name: "", document: "", address: "", city: "", state: "", representative: "", email: "" };
}

export function defaultData(): ContractData {
  return {
    type: "project",
    templateId: "",
    logo: "",
    me: emptyParty(),
    other: emptyParty(),
    scope: {
      description: "Produção de vídeos para divulgação da marca nas redes sociais, incluindo captação e edição.",
      deliverables: "4 vídeos verticais (9:16) de até 60 segundos, editados, com legendas e trilha licenciada.",
      captureDate: "",
      deliveryDays: "10",
      revisions: "2",
      captureLocation: "",
      termMonths: "6",
      dueDay: "10",
      deliveriesPerMonth: "8",
      noticeDays: "30",
      endClient: "",
      imagePurpose:
        "Redes sociais, site, apresentações institucionais, portfólio e campanhas digitais, orgânicas ou impulsionadas.",
      imageTerritory: "Território nacional e internet",
      imageTermMonths: "24",
    },
    payment: { amount: "", condition: "split", firstDueDate: "", imagePaid: false },
    rules: {
      lateFee: true,
      scopeControl: true,
      approval: true,
      reschedule: true,
      editableFiles: true,
      portfolio: true,
      confidentiality: true,
      dataProtection: true,
      signatures: true,
      approvalDays: "5",
      rescheduleHours: "48",
    },
    signature: { date: todayISO(), city: "", state: "", forumEnabled: true, forum: "" },
  };
}

export function normalize(partial: Partial<ContractData>): ContractData {
  const base = defaultData();
  const types: ContractType[] = ["custom", "project", "recurring", "outsourcing", "image"];
  return {
    ...base,
    ...partial,
    type: types.includes(partial.type as ContractType) ? (partial.type as ContractType) : base.type,
    logo: typeof partial.logo === "string" ? partial.logo : "",
    templateId: typeof partial.templateId === "string" ? partial.templateId : "",
    me: { ...base.me, ...(partial.me || {}) },
    other: { ...base.other, ...(partial.other || {}) },
    scope: { ...base.scope, ...(partial.scope || {}) },
    payment: { ...base.payment, ...(partial.payment || {}) },
    rules: { ...base.rules, ...(partial.rules || {}) },
    signature: { ...base.signature, ...(partial.signature || {}) },
  };
}

export function titleOf(data: ContractData) {
  return `${CONTRACT_TYPE_LABELS[data.type]} — ${data.other.name.trim() || "Sem nome"}`;
}
