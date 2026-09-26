import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";

interface OwnerFilterProps {
  value: string;
  onChange: (ownerId: string) => void;
}

/** Nome do usuário filtrado (para o chip de filtro ativo). */
export function useOwnerName(ownerId: string) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: users } = useAsyncData(() => (isAdmin ? resources.users.list() : Promise.resolve([])), [isAdmin]);
  return (users || []).find((item) => item._id === ownerId)?.name || "";
}

/** Filtro por usuário, visível só para administradores (os demais veem apenas os próprios dados). */
export default function OwnerFilter({ value, onChange }: OwnerFilterProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
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
