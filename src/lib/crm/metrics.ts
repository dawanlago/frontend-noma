import { LEAD_STAGES, PROPOSAL_STAGES } from "@/lib/constants";
import type { Lead, LeadStage } from "@/types";
import { leadDateOnly } from "./model";

export interface LeadFilters {
  search: string;
  service: string;
  /** "" = todos; "1".."12" = mês de criação no ano corrente. */
  month: string;
}

export const EMPTY_LEAD_FILTERS: LeadFilters = { search: "", service: "", month: "" };

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function filterLeads(leads: Lead[], filters: LeadFilters, now = new Date()): Lead[] {
  const term = normalizeText(filters.search);
  const month = Number(filters.month);
  const year = now.getFullYear();
  return leads.filter((lead) => {
    if (term && !normalizeText(`${lead.name} ${lead.company}`).includes(term)) return false;
    if (filters.service && lead.service !== filters.service) return false;
    if (month) {
      const created = new Date(lead.createdAt);
      if (created.getFullYear() !== year || created.getMonth() + 1 !== month) return false;
    }
    return true;
  });
}

export interface LeadMetrics {
  total: number;
  openValue: number;
  wonValue: number;
  wonCount: number;
  averageTicket: number;
  conversionRate: number;
  proposalCount: number;
}

export function computeLeadMetrics(leads: Lead[]): LeadMetrics {
  const total = leads.length;
  const won = leads.filter((lead) => lead.stage === "won");
  const allValue = sum(leads);
  const wonValue = sum(won);
  return {
    total,
    openValue: allValue - wonValue,
    wonValue,
    wonCount: won.length,
    averageTicket: total ? allValue / total : 0,
    conversionRate: total ? won.length / total : 0,
    proposalCount: leads.filter((lead) => PROPOSAL_STAGES.includes(lead.stage)).length,
  };
}

function sum(leads: Lead[]) {
  return leads.reduce((acc, lead) => acc + (Number(lead.value) || 0), 0);
}

export interface StageColumn {
  stage: LeadStage;
  label: string;
  leads: Lead[];
  total: number;
}

export function groupByStage(leads: Lead[]): StageColumn[] {
  return LEAD_STAGES.map(({ value, label }) => {
    const items = leads.filter((lead) => lead.stage === value);
    return { stage: value, label, leads: items, total: sum(items) };
  });
}

export interface StageConversion {
  stage: LeadStage;
  label: string;
  /** Leads que estão nesta etapa ou além dela. */
  reached: number;
  current: number;
  rate: number;
}

/** Como não há histórico de etapas, "alcançou" = está nesta etapa ou em uma posterior. */
export function conversionByStage(leads: Lead[]): StageConversion[] {
  const order = LEAD_STAGES.map((item) => item.value);
  const total = leads.length;
  return LEAD_STAGES.map(({ value, label }, index) => {
    const reached = leads.filter((lead) => order.indexOf(lead.stage) >= index).length;
    const current = leads.filter((lead) => lead.stage === value).length;
    return { stage: value, label, reached, current, rate: total ? reached / total : 0 };
  });
}

export interface SourceGroup {
  label: string;
  count: number;
  value: number;
  share: number;
}

/** Agrupa pela origem sem diferenciar maiúsculas/minúsculas (mantém a primeira grafia vista). */
export function groupBySource(leads: Lead[]): SourceGroup[] {
  const map = new Map<string, SourceGroup>();
  for (const lead of leads) {
    const raw = (lead.source || "").trim();
    const key = raw ? normalizeText(raw) : "";
    const label = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Não informado";
    const group = map.get(key) || { label, count: 0, value: 0, share: 0 };
    group.count += 1;
    group.value += Number(lead.value) || 0;
    map.set(key, group);
  }
  const total = leads.length;
  return Array.from(map.values())
    .map((group) => ({ ...group, share: total ? group.count / total : 0 }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
}

export function proposalLeads(leads: Lead[]): Lead[] {
  return leads.filter((lead) => PROPOSAL_STAGES.includes(lead.stage));
}

/** Próxima ação vencida (antes de hoje) e lead ainda não ganho. */
export function isLeadOverdue(lead: Lead, today: string): boolean {
  const date = leadDateOnly(lead);
  return Boolean(date) && date < today && lead.stage !== "won";
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
