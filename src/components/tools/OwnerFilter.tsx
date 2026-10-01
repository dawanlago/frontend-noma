import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import type { ModuleKey } from "@/types";

interface OwnerFilterProps {
  value: string;
  onChange: (ownerId: string) => void;
  /** Módulo da tela: o filtro aparece para quem vê os registros de todos nele (sem módulo, só admin). */
  module?: ModuleKey;
}

/** Vê os registros de todos (admin ou nível "todos" no módulo)? */
function useSeesAll(module?: ModuleKey) {
  const { isAdmin, seesAll } = useAuth();
  return module ? seesAll(module) : isAdmin;
}

/** Nome do usuário filtrado (para o chip de filtro ativo). */
export function useOwnerName(ownerId: string, module?: ModuleKey) {
  const isAdmin = useSeesAll(module);
  const { data: users } = useAsyncData(() => (isAdmin ? resources.users.list() : Promise.resolve([])), [isAdmin]);
  return (users || []).find((item) => item._id === ownerId)?.name || "";
}

/** Filtro por usuário, visível só para quem vê os registros de todos (os demais veem apenas os próprios). */
export default function OwnerFilter({ value, onChange, module }: OwnerFilterProps) {
  const isAdmin = useSeesAll(module);
  const { data: users } = useAsyncData(() => (isAdmin ? resources.users.list() : Promise.resolve([])), [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="w-full sm:w-52">
      <Select
        value={value}
        onChange={onChange}
        placeholder="Todos os usuários"
        options={[
          { value: "", label: "Todos os usuários" },
          ...(users || []).map((item) => ({ value: item._id, label: item.name })),
        ]}
      />
    </div>
  );
}
