import type { FinanceStatus, LeadStatus, LeadTemperature, TransactionType } from "@/types";

export const APP_NAME = "Noma";

export const USER_ROLES = ["admin", "manager", "seller"] as const;

export const USER_ROLE_LABELS: Record<(typeof USER_ROLES)[number], string> = {
  admin: "Administrador",
  manager: "Gestor",
  seller: "Vendedor",
};

export const LEAD_TEMPERATURES: { value: LeadTemperature; label: string; tone: string }[] = [
  { value: "cold", label: "Frio", tone: "bg-sky-100 text-sky-700" },
  { value: "warm", label: "Morno", tone: "bg-gold/10 text-gold" },
  { value: "hot", label: "Quente", tone: "bg-burgundy/10 text-burgundy" },
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  open: "Em andamento",
  won: "Venda feita",
  lost: "Perdida",
};

/* Valores iniciais das listas de opções (as listas reais vêm de Configurações). */
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
