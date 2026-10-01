import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import type { Lead } from "@/types";

interface LeadOwnerFieldProps {
  lead: Lead;
  /** Troca o responsável (só chamado para quem vê todas as negociações). */
  onChange: (ownerId: string) => void;
}

/** Responsável pela negociação: quem vê todas as negociações do CRM pode trocar; os demais só veem o nome. */
export default function LeadOwnerField({ lead, onChange }: LeadOwnerFieldProps) {
  const { seesAll } = useAuth();
  const canChange = seesAll("crm");
  const { data: users } = useAsyncData(() => (canChange ? resources.users.list() : Promise.resolve([])), [canChange]);

  if (!canChange) return <>{lead.ownerName || "—"}</>;

  const options = (users || []).filter((user) => user.isActive !== false || user._id === lead.ownerId).map((user) => ({ value: user._id, label: user.name }));
  // Enquanto a lista carrega (ou se o responsável saiu da empresa), mantém o nome atual visível.
  if (!options.some((option) => option.value === lead.ownerId)) options.unshift({ value: lead.ownerId, label: lead.ownerName || "Sem responsável" });

  return (
    <div className="w-44 text-left">
      <Select value={lead.ownerId} options={options} onChange={(ownerId) => ownerId !== lead.ownerId && onChange(ownerId)} />
    </div>
  );
}
