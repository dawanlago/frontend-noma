import type { CaptureForm, FormAvailability, FormField, FormFieldTarget, FormFieldType } from "@/types";

export const FORM_FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "eventDate", label: "Data do evento (com regra de disponibilidade)" },
  { value: "select", label: "Seleção (uma opção)" },
  { value: "multiselect", label: "Seleção (várias opções)" },
  { value: "checkbox", label: "Caixa de confirmação" },
];

export const FORM_FIELD_TARGETS: { value: FormFieldTarget; label: string }[] = [
  { value: "", label: "Só guardar a resposta" },
  { value: "name", label: "Nome do contato" },
  { value: "email", label: "E-mail do contato" },
  { value: "phone", label: "Telefone do contato" },
  { value: "company", label: "Empresa" },
  { value: "instagram", label: "Instagram" },
];

/** Rascunho de formulário novo: só é gravado ao clicar em "Salvar". */
export function draftForm(): CaptureForm {
  const field = (label: string, type: FormField["type"], target: FormField["target"], required = false): FormField => ({
    key: "",
    label,
    type,
    required,
    options: [],
    placeholder: "",
    target,
  });
  return {
    _id: "",
    ownerId: "",
    name: "Novo formulário",
    description: "",
    publicId: "",
    isActive: true,
    fields: [
      field("Nome", "text", "name", true),
      field("E-mail", "email", "email", true),
      field("WhatsApp", "phone", "phone"),
      field("Empresa", "text", "company"),
      field("Como podemos ajudar?", "textarea", ""),
    ],
    successMessage: "Recebemos suas respostas. Obrigado!",
    createLead: true,
    availability: { minNoticeDays: 0, blockedDates: [], message: "" },
    createdAt: "",
    updatedAt: "",
  };
}

export function newField(): FormField {
  return { key: "", label: "", type: "text", required: false, options: [], placeholder: "", target: "" };
}

export function publicFormUrl(publicId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/f/${publicId}`;
}

export function answerText(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return value === undefined || value === null ? "" : String(value);
}

/** Hoje (YYYY-MM-DD) no horário local. */
export function todayKey(now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** YYYY-MM-DD → DD/MM/AAAA. */
export function formatDateKey(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

/** Mesma regra do servidor: antecedência mínima, data passada ou período bloqueado. */
export function eventAvailability(date: string, availability: FormAvailability | undefined, today = todayKey()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const days = daysBetween(today, date);
  const minNotice = availability?.minNoticeDays || 0;
  const unavailable =
    days < 0 || (minNotice > 0 && days < minNotice) || (availability?.blockedDates || []).some((range) => date >= range.from && date <= range.to);
  return { days, unavailable };
}

/** Telefone brasileiro: DDD + número (10 ou 11 dígitos), com ou sem +55. */
export function isValidPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
  return /^[1-9]{2}\d{8,9}$/.test(digits) && (digits.length === 10 || digits[2] === "9");
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
