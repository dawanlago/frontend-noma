import type { CustomValues, Funnel, Lead, LeadProduct, LeadTemperature, Product } from "@/types";
import { maskCurrencyBRL, parseCurrencyBRL } from "@/utils/format";
import type { LeadPayload } from "@/lib/resources";

/** Estado do formulário de negociação (valor avulso mascarado "1.234,56", data "YYYY-MM-DD"). */
export interface LeadFormState {
  name: string;
  contactId: string;
  companyId: string;
  funnelId: string;
  stageId: string;
  service: string;
  source: string;
  products: LeadProduct[];
  customValue: string;
  temperature: LeadTemperature;
  nextActionDate: string;
  notes: string;
  custom: CustomValues;
}

export function emptyLeadForm(funnel?: Funnel): LeadFormState {
  return {
    name: "",
    contactId: "",
    companyId: "",
    funnelId: funnel?._id || "",
    stageId: funnel ? firstOpenStageId(funnel) : "",
    service: "",
    source: "",
    products: [],
    customValue: "",
    temperature: "warm",
    nextActionDate: "",
    notes: "",
    custom: {},
  };
}

export function firstOpenStageId(funnel: Funnel) {
  return (funnel.stages.find((stage) => stage.kind === "open") || funnel.stages[0])?._id || "";
}

export function leadToForm(lead: Lead): LeadFormState {
  return {
    name: lead.name || "",
    contactId: lead.contactId || "",
    companyId: lead.companyId || "",
    funnelId: lead.funnelId,
    stageId: lead.stageId,
    service: lead.service || "",
    source: lead.source || "",
    products: lead.products || [],
    customValue: lead.customValue ? maskCurrencyBRL(lead.customValue) : "",
    temperature: lead.temperature || "warm",
    nextActionDate: leadDateOnly(lead),
    notes: lead.notes || "",
    custom: lead.custom || {},
  };
}

/** Converte o formulário no corpo enviado à API. `nextActionDate` vazio limpa a data. */
export function formToPayload(form: LeadFormState): LeadPayload {
  return {
    name: form.name.trim(),
    contactId: form.contactId,
    companyId: form.companyId,
    funnelId: form.funnelId,
    stageId: form.stageId,
    service: form.service,
    source: form.source,
    products: form.products,
    customValue: parseCurrencyBRL(form.customValue),
    temperature: form.temperature,
    nextActionDate: form.nextActionDate || null,
    notes: form.notes,
    custom: form.custom,
  };
}

export function productPrice(product: Pick<Product, "operationalCost" | "profit">) {
  return (Number(product.operationalCost) || 0) + (Number(product.profit) || 0);
}

export function formTotal(form: Pick<LeadFormState, "products" | "customValue">) {
  return form.products.reduce((total, item) => total + (Number(item.price) || 0), 0) + parseCurrencyBRL(form.customValue);
}

/** Data da próxima ação como "YYYY-MM-DD" (evita o deslocamento de fuso ao exibir). */
export function leadDateOnly(lead: Pick<Lead, "nextActionDate">): string {
  return lead.nextActionDate ? lead.nextActionDate.slice(0, 10) : "";
}

/** Nome exibido: nome da negociação, contato ou empresa. */
export function leadSubtitle(lead: Pick<Lead, "name" | "contactName" | "company">) {
  return [lead.contactName && lead.contactName !== lead.name ? lead.contactName : "", lead.company]
    .filter(Boolean)
    .join(" · ");
}
