import type { FinanceStatus, LeadStage, TransactionType } from "@/types";

export const APP_NAME = "Noma";

export const USER_ROLES = ["admin", "manager", "seller"] as const;

export const USER_ROLE_LABELS: Record<(typeof USER_ROLES)[number], string> = {
  admin: "Administrador",
  manager: "Gestor",
  seller: "Vendedor",
};

export const LEAD_STAGES: { value: LeadStage; label: string }[] = [
  { value: "new", label: "Novo lead" },
  { value: "first_contact", label: "Primeiro contato" },
  { value: "meeting", label: "Reunião marcada" },
  { value: "proposal_sent", label: "Proposta enviada" },
  { value: "awaiting", label: "Aguardando resposta" },
  { value: "negotiation", label: "Em negociação" },
  { value: "won", label: "Fechado / ganho" },
];

export const LEAD_STAGE_LABELS = Object.fromEntries(LEAD_STAGES.map((s) => [s.value, s.label])) as Record<
  LeadStage,
  string
>;

/** Etapas a partir das quais o lead aparece na aba "Propostas" do CRM. */
export const PROPOSAL_STAGES: LeadStage[] = ["proposal_sent", "awaiting", "negotiation", "won"];

export const LEAD_SERVICES = [
  "Conteúdo mensal",
  "Institucional",
  "Evento",
  "Produto",
  "Depoimentos",
  "Foto + Vídeo",
  "Outro",
] as const;

export const INCOME_CATEGORIES = [
  "Contrato mensal",
  "Evento",
  "Produção avulsa",
  "Edição",
  "Fotografia",
  "Outro",
] as const;

export const EXPENSE_CATEGORIES = [
  "Software",
  "Equipamento",
  "Transporte",
  "Alimentação",
  "Freelancer",
  "Marketing",
  "Contabilidade",
  "Impostos",
  "Estrutura",
  "Outros",
] as const;

export const PAYMENT_METHODS = ["Pix", "Transferência", "Cartão", "Dinheiro", "Boleto", "Outro"] as const;

export const FINANCE_STATUS_OPTIONS: Record<TransactionType, { value: FinanceStatus; label: string }[]> = {
  income: [
    { value: "received", label: "Recebido" },
    { value: "pending", label: "A receber" },
  ],
  expense: [
    { value: "paid", label: "Pago" },
    { value: "planned", label: "Previsto" },
  ],
};

export const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
