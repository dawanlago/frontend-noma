import type { Funnel, FunnelStage, Lead } from "@/types";
import { leadDateOnly } from "./model";

export interface LeadFilters {
  search: string;
  service: string;
  temperature: string;
  /** "" = todos; "1".."12" = mês de criação no ano corrente. */
  month: string;
}

export const EMPTY_LEAD_FILTERS: LeadFilters = { search: "", service: "", temperature: "", month: "" };

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
    if (term && !normalizeText(`${lead.name} ${lead.contactName} ${lead.company}`).includes(term)) return false;
    if (filters.service && lead.service !== filters.service) return false;
    if (filters.temperature && lead.temperature !== filters.temperature) return false;
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
  lostCount: number;
  averageTicket: number;
  conversionRate: number;
}

function sum(leads: Lead[]) {
  return leads.reduce((acc, lead) => acc + (Number(lead.value) || 0), 0);
}

export function computeLeadMetrics(leads: Lead[]): LeadMetrics {
  const total = leads.length;
  const won = leads.filter((lead) => lead.status === "won");
  const closed = won.length + leads.filter((lead) => lead.status === "lost").length;
  return {
    total,
    openValue: sum(leads.filter((lead) => lead.status === "open")),
    wonValue: sum(won),
    wonCount: won.length,
    lostCount: closed - won.length,
    averageTicket: won.length ? sum(won) / won.length : total ? sum(leads) / total : 0,
    conversionRate: total ? won.length / total : 0,
  };
}

export interface StageColumn {
  stage: FunnelStage;
  leads: Lead[];
  total: number;
}

export function groupByStage(leads: Lead[], funnel: Funnel): StageColumn[] {
  return funnel.stages.map((stage) => {
    const items = leads.filter((lead) => lead.stageId === stage._id);
    return { stage, leads: items, total: sum(items) };
  });
}

export interface StageConversion {
  stage: FunnelStage;
  /** Negociações que estão nesta etapa ou além dela (vendas feitas contam como além de todas). */
  reached: number;
  rate: number;
}

export function conversionByStage(leads: Lead[], funnel: Funnel): StageConversion[] {
  const order = funnel.stages.map((stage) => stage._id);
  const total = leads.length;
  return funnel.stages
    .filter((stage) => stage.kind !== "lost")
    .map((stage) => {
      const index = order.indexOf(stage._id);
      const reached = leads.filter(
        (lead) => lead.status === "won" || (lead.status === "open" && order.indexOf(lead.stageId) >= index),
      ).length;
      return { stage, reached, rate: total ? reached / total : 0 };
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

/** Próxima ação vencida (antes de hoje) em negociação ainda aberta. */
export function isLeadOverdue(lead: Lead, today: string): boolean {
  const date = leadDateOnly(lead);
  return Boolean(date) && date < today && lead.status === "open";
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
