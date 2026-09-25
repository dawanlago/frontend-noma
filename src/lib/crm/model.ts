import { LEAD_SERVICES } from "@/lib/constants";
import type { Lead, LeadStage } from "@/types";
import { maskCurrencyBRL, parseCurrencyBRL } from "@/utils/format";

/** Estado do formulário de lead (valor mascarado "1.234,56", data "YYYY-MM-DD"). */
export interface LeadForm {
  name: string;
  company: string;
  service: string;
  value: string;
  stage: LeadStage;
  nextActionDate: string;
  source: string;
  notes: string;
}

export function emptyLeadForm(): LeadForm {
  return {
    name: "",
    company: "",
    service: LEAD_SERVICES[0],
    value: "",
    stage: "new",
    nextActionDate: "",
    source: "",
    notes: "",
  };
}

export function leadToForm(lead: Lead): LeadForm {
  return {
    name: lead.name || "",
    company: lead.company || "",
    service: lead.service || LEAD_SERVICES[0],
    value: lead.value ? maskCurrencyBRL(lead.value) : "",
    stage: lead.stage || "new",
    nextActionDate: leadDateOnly(lead),
    source: lead.source || "",
    notes: lead.notes || "",
  };
}

/** Converte o formulário no corpo enviado à API. `nextActionDate` vazio limpa a data. */
export function formToPayload(form: LeadForm): Partial<Lead> {
  return {
    name: form.name.trim(),
    company: form.company.trim(),
    service: form.service,
    value: parseCurrencyBRL(form.value),
    stage: form.stage,
    // A API aceita null para remover a data; o tipo compartilhado só declara string.
    nextActionDate: (form.nextActionDate || null) as unknown as string,
    source: form.source.trim(),
    notes: form.notes,
  };
}

/** Data da próxima ação como "YYYY-MM-DD" (evita o deslocamento de fuso ao exibir). */
export function leadDateOnly(lead: Pick<Lead, "nextActionDate">): string {
  return lead.nextActionDate ? lead.nextActionDate.slice(0, 10) : "";
}
