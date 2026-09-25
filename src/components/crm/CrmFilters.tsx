import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import OptionSelect from "@/components/options/OptionSelect";
import OwnerFilter from "@/components/tools/OwnerFilter";
import Select from "@/components/ui/Select";
import { LEAD_TEMPERATURES, MONTH_NAMES } from "@/lib/constants";
import type { LeadFilters } from "@/lib/crm/metrics";

interface CrmFiltersProps {
  filters: LeadFilters;
  onChange: (filters: LeadFilters) => void;
  ownerId: string;
  onOwnerChange: (ownerId: string) => void;
}

const MONTH_SHORT = MONTH_NAMES.map((name) => name.charAt(0).toUpperCase() + name.slice(1, 3));

export default function CrmFilters({ filters, onChange, ownerId, onOwnerChange }: CrmFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <label className="relative block flex-1">
        <span className="sr-only">Buscar negociação, contato ou empresa</span>
        <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
        <input
          className="input-search pl-9"
          placeholder="Buscar negociação, contato ou empresa"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-4 lg:flex">
        <div className="lg:w-52">
          <OptionSelect
            list="leadService"
            noAdd
            value={filters.service}
            onChange={(service) => onChange({ ...filters, service })}
            emptyLabel="Todos os serviços"
          />
        </div>
        <div className="lg:w-40">
          <Select
            value={filters.temperature}
            onChange={(temperature) => onChange({ ...filters, temperature })}
            placeholder="Termômetro"
            options={[{ value: "", label: "Todos" }, ...LEAD_TEMPERATURES.map((item) => ({ value: item.value, label: item.label }))]}
          />
        </div>
        <div className="lg:w-40">
          <Select
            value={filters.month}
            onChange={(month) => onChange({ ...filters, month })}
            placeholder="Todos"
            options={[
              { value: "", label: "Todos os meses" },
              ...MONTH_SHORT.map((label, index) => ({ value: String(index + 1), label })),
            ]}
          />
        </div>
        <OwnerFilter value={ownerId} onChange={onOwnerChange} />
      </div>
    </div>
  );
}
