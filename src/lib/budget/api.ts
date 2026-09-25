import { resources } from "@/lib/resources";
import type { ToolDocument } from "@/types";
import type { BudgetData } from "./model";

type BudgetDocument = ToolDocument<BudgetData>;

const raw = resources.tools.budgets;

/**
 * `resources.tools.budgets` é tipado com `data: unknown`; este adaptador só
 * refina os tipos para `BudgetData` (mesmas chamadas à API).
 */
export const budgetsApi = {
  list: raw.list,
  get: (id: string) => raw.get(id) as Promise<BudgetDocument>,
  create: (payload: { title: string; data: BudgetData }) => raw.create(payload) as Promise<BudgetDocument>,
  update: (id: string, payload: { title?: string; data?: BudgetData }) =>
    raw.update(id, payload) as Promise<BudgetDocument>,
  duplicate: (id: string) => raw.duplicate(id) as Promise<BudgetDocument>,
  remove: raw.remove,
};
