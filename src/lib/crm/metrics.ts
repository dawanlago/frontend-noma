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

/** Dias corridos desde a data (0 = hoje). */
export function daysSince(date: string | undefined, now = new Date()): number | null {
  if (!date) return null;
  const time = new Date(date).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((now.getTime() - time) / 86_400_000));
}

/** "hoje", "1 dia", "12 dias". */
export function formatDays(days: number): string {
  if (days === 0) return "hoje";
  return `${days} dia${days === 1 ? "" : "s"}`;
}

/** Desconto do fechamento: oferecido − fechado (null se não informado ou sem desconto). */
export function leadDiscount(lead: Pick<Lead, "offeredValue" | "closedValue">) {
  const offered = Number(lead.offeredValue) || 0;
  const closed = lead.closedValue;
  if (!offered || closed === undefined || closed === null || closed >= offered) return null;
  const value = Math.round((offered - closed) * 100) / 100;
  return { value, percent: value / offered };
}

/** "Evento 12/12 · faltam 40 dias" (ou "já passou"). */
export function eventLabel(eventDate?: string, now = new Date()) {
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}/.test(eventDate)) return "";
  const date = eventDate.slice(0, 10);
  const today = new Date(now.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
  const days = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  const when = days < 0 ? "já passou" : days === 0 ? "é hoje" : `faltam ${days} dia${days === 1 ? "" : "s"}`;
  return `Evento ${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)} · ${when}`;
}

export interface StageTime {
  id: string;
  name: string;
  count: number;
  /** Média de dias parados (negociações em aberto). */
  averageDays: number;
  /** Negociações sem contato há mais de 7 dias. */
  stale: number;
  subStages: { id: string; name: string; count: number; averageDays: number }[];
}

/** Quanto tempo as negociações em aberto estão paradas em cada etapa e microetapa. */
export function timeByStage(leads: Lead[], funnel: Funnel, now = new Date()): StageTime[] {
  const average = (items: Lead[], pick: (lead: Lead) => string | undefined) =>
    items.length ? Math.round(items.reduce((sum, lead) => sum + (daysSince(pick(lead), now) || 0), 0) / items.length) : 0;
  return funnel.stages
    .filter((stage) => stage.kind === "open")
    .map((stage) => {
      const items = leads.filter((lead) => lead.status === "open" && lead.stageId === stage._id);
      return {
        id: stage._id,
        name: stage.name,
        count: items.length,
        averageDays: average(items, (lead) => lead.stageEnteredAt || lead.createdAt),
        stale: items.filter((lead) => (daysSince(lead.lastContactAt || lead.createdAt, now) || 0) > 7).length,
        subStages: (stage.subStages || []).map((sub) => {
          const inSub = items.filter((lead) => lead.subStageId === sub._id);
          return {
            id: sub._id,
            name: sub.name,
            count: inSub.length,
            averageDays: average(inSub, (lead) => lead.subStageEnteredAt || lead.stageEnteredAt || lead.createdAt),
          };
        }),
      };
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

export interface LostReasonGroup {
  /** Valor gravado na negociação ("" = sem motivo registrado). */
  reason: string;
  count: number;
  value: number;
  /** Parte das negociações perdidas. */
  share: number;
}

/** Negociações perdidas agrupadas pelo motivo (as mais frequentes primeiro). */
export function groupByLostReason(leads: Lead[]): LostReasonGroup[] {
  const lost = leads.filter((lead) => lead.status === "lost");
  const map = new Map<string, LostReasonGroup>();
  for (const lead of lost) {
    const reason = (lead.lostReason || "").trim();
    const group = map.get(reason) || { reason, count: 0, value: 0, share: 0 };
    group.count += 1;
    group.value += Number(lead.value) || 0;
    map.set(reason, group);
  }
  return Array.from(map.values())
    .map((group) => ({ ...group, share: lost.length ? group.count / lost.length : 0 }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
}
