import { resources } from "@/lib/resources";
import type { ToolDocument } from "@/types";
import type { ContractData } from "./model";

const base = resources.tools.contracts;

/** `resources.tools.contracts` com o tipo dos dados do contrato. */
export const contractsApi = {
  list: base.list,
  get: (id: string) => base.get(id) as Promise<ToolDocument<ContractData>>,
  create: (payload: { title: string; data: ContractData }) => base.create(payload) as Promise<ToolDocument<ContractData>>,
  update: (id: string, payload: { title?: string; data?: ContractData }) =>
    base.update(id, payload) as Promise<ToolDocument<ContractData>>,
  duplicate: (id: string) => base.duplicate(id) as Promise<ToolDocument<ContractData>>,
  remove: base.remove,
};
