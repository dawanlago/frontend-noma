import { resources } from "@/lib/resources";
import { todayISO } from "@/utils/format";
import { defaultData, moneyText, normalize, titleOf, type ProposalData } from "./model";

/* Atalhos para começar uma proposta: padrões da última proposta, dados da negociação e cópia de uma anterior. */

/** Dados recebidos na URL (CRM ou Calculadora de Orçamento). */
export interface ProposalPrefill {
  cliente?: string;
  empresa?: string;
  valor?: number | null;
  /** Negociação do CRM: o aceite do cliente entra no histórico dela. */
  leadId?: string;
}

const proposals = resources.tools.proposals;

async function getData(id: string) {
  const doc = await proposals.get(id);
  return normalize((doc.data || {}) as Partial<ProposalData>);
}

/**
 * Proposta em branco já com "Sua empresa", contatos do fechamento e "Identidade visual"
 * da proposta mais recente do usuário (para não redigitar). Sem proposta anterior: padrão.
 */
export async function newProposalData(userId?: string): Promise<ProposalData> {
  const data = defaultData();
  try {
    const [last] = await proposals.list(userId ? { ownerId: userId } : undefined);
    if (!last) return data;
    const previous = await getData(last._id);
    data.company = previous.company;
    data.identity = previous.identity;
    data.closing = { ...data.closing, company: previous.closing.company, site: previous.closing.site, contact: previous.closing.contact };
    data.structure = previous.structure;
  } catch {
    // Sem os padrões a proposta começa do zero: não impede a criação.
  }
  return data;
}

export function applyPrefill(data: ProposalData, prefill: ProposalPrefill): ProposalData {
  const next: ProposalData = { ...data, client: { ...data.client }, investment: { ...data.investment, single: { ...data.investment.single } } };
  if (prefill.cliente) next.client.name = prefill.cliente;
  if (prefill.empresa) next.client.company = prefill.empresa;
  if (prefill.valor) next.investment.single.value = moneyText(prefill.valor);
  if (prefill.leadId) next.leadId = prefill.leadId;
  return next;
}

/** Cria uma nova proposta copiando outra: troca o cliente (vazio ou o da negociação) e a data. */
export async function startFromProposal(sourceId: string, prefill: ProposalPrefill = {}) {
  const copy = await proposals.duplicate(sourceId);
  const base = await getData(copy._id);
  base.client = { ...base.client, name: "", company: "", date: todayISO() };
  base.leadId = "";
  const data = applyPrefill(base, prefill);
  await proposals.update(copy._id, { title: titleOf(data), data });
  return copy._id;
}

/** Essenciais para gerar a proposta: para quem é e quanto custa. As demais etapas são opcionais. */
export function missingEssentials(data: ProposalData): { step: number; label: string }[] {
  const missing: { step: number; label: string }[] = [];
  if (!data.client.name.trim() && !data.client.company.trim()) missing.push({ step: 1, label: "Cliente (nome ou empresa)" });
  const hasValue = (text: string) => /[1-9]/.test(text.replace(/^R\$\s*/, ""));
  const priced =
    data.investment.mode === "single"
      ? hasValue(data.investment.single.value)
      : data.investment.packages.some((pkg) => hasValue(pkg.value));
  if (!priced) missing.push({ step: 7, label: "Investimento (valor)" });
  return missing;
}
