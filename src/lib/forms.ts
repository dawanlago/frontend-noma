import type { CaptureForm, FormField, FormFieldTarget, FormFieldType } from "@/types";

export const FORM_FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
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
