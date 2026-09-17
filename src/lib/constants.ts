export const APP_NAME = "Noma";

export const USER_ROLES = ["admin", "manager", "seller"] as const;
export const DEAL_TEMPERATURES = ["cold", "warm", "hot"] as const;
export const STAGE_TYPES = ["agenda", "closure", "general"] as const;
export const TRANSACTION_TYPES = ["income", "expense"] as const;
export const DEAL_SOURCES = [
  "whatsapp",
  "instagram",
  "landing_page",
  "manual",
] as const;
export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export const FORM_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "email",
  "phone",
  "select",
  "multiselect",
  "boolean",
] as const;

export const FINANCIAL_DISTRIBUTION = {
  marketing: 0.1,
  tax: 0.08,
  equipment: 0.07,
  cash: 0.05,
  profit: 0.25,
} as const;

export const TEMPERATURE_LABELS: Record<(typeof DEAL_TEMPERATURES)[number], string> = {
  cold: "Frio",
  warm: "Morno",
  hot: "Quente",
};

export const STAGE_TYPE_LABELS: Record<(typeof STAGE_TYPES)[number], string> = {
  agenda: "Agendamento",
  closure: "Fechamento",
  general: "Geral",
};

export const USER_ROLE_LABELS: Record<(typeof USER_ROLES)[number], string> = {
  admin: "Administrador",
  manager: "Gestor",
  seller: "Vendedor",
};

export const DEAL_SOURCE_LABELS: Record<(typeof DEAL_SOURCES)[number], string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  landing_page: "Landing page",
  manual: "Manual",
};

export const TASK_STATUS_LABELS: Record<(typeof TASK_STATUSES)[number], string> = {
  todo: "A fazer",
  doing: "Fazendo",
  done: "Feito",
};

export const FORM_FIELD_TYPE_LABELS: Record<(typeof FORM_FIELD_TYPES)[number], string> = {
  text: "Texto",
  textarea: "Texto longo",
  number: "Número",
  date: "Data",
  email: "E-mail",
  phone: "Telefone",
  select: "Seleção",
  multiselect: "Múltipla seleção",
  boolean: "Sim/Não",
};

export const FINANCE_INCOME_CATEGORIES = [
  { value: "sale", label: "Venda" },
  { value: "service", label: "Serviço" },
  { value: "recurring", label: "Recorrência" },
  { value: "other_income", label: "Outras entradas" },
] as const;

export const FINANCE_EXPENSE_CATEGORIES = [
  { value: "marketing", label: "Marketing" },
  { value: "operational", label: "Operacional" },
  { value: "tax", label: "Impostos" },
  { value: "equipment", label: "Equipamento" },
  { value: "people", label: "Pessoal" },
  { value: "software", label: "Software" },
  { value: "other_expense", label: "Outras saídas" },
] as const;

export const FINANCE_CATEGORY_LABELS: Record<string, string> = {
  sale: "Venda",
  service: "Serviço",
  recurring: "Recorrência",
  other_income: "Outras entradas",
  marketing: "Marketing",
  operational: "Operacional",
  tax: "Impostos",
  equipment: "Equipamento",
  people: "Pessoal",
  software: "Software",
  other_expense: "Outras saídas",
};
