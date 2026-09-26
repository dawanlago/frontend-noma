import type { ProposalViewSession } from "@/types";

/* Formatação das visualizações do link público da proposta. */

/** "45 s", "3 min 20 s", "1 h 05 min". */
export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  if (s < 60) return `${s} s`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return s % 60 ? `${minutes} min ${s % 60} s` : `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

/** "agora", "há 5 min", "há 2h", "há 3 dias". */
export function timeAgo(date: string | Date, now = Date.now()) {
  const diff = Math.max(0, now - new Date(date).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  const months = Math.floor(days / 30);
  return `há ${months} ${months === 1 ? "mês" : "meses"}`;
}

const DEVICE_LABEL: Record<ProposalViewSession["device"], string> = {
  mobile: "Celular",
  tablet: "Tablet",
  desktop: "Computador",
  unknown: "Dispositivo desconhecido",
};

/** "Celular · iOS · Safari". */
export function deviceLabel(session: Pick<ProposalViewSession, "device" | "os" | "browser">) {
  return [DEVICE_LABEL[session.device] || DEVICE_LABEL.unknown, session.os, session.browser].filter(Boolean).join(" · ");
}

export function proposalLinkUrl(token: string) {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/p/${token}`;
}
