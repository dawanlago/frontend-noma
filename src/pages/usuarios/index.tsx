import { FormEvent, useMemo, useState } from "react";
import Head from "next/head";
import FormField from "@/components/ui/FormField";
import ListWorkspace from "@/components/ui/ListWorkspace";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { getInitials } from "@/utils/format";
import type { User, UserRole } from "@/types";

export default function UsersPage() {
  const { data: users, isLoading, error, reload } = useAsyncData(() => resources.users.list());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; password: string; role: UserRole }>({
    name: "",
    email: "",
    password: "",
    role: "seller",
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users || [];
    return (users || []).filter((user) => user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term));
  }, [users, search]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await resources.users.create(form);
    setModalOpen(false);
    await reload();
  }

  async function handleDelete(user: User) {
    if (!window.confirm(`Excluir usuário ${user.name}?`)) return;
    await resources.users.remove(user._id);
    await reload();
  }

  return (
    <>
      <Head><title>Usuários | Noma CRM</title></Head>
      <ListWorkspace
        title="Usuários"
        actionLabel="Inserir usuário"
        onAction={() => setModalOpen(true)}
        countLabel={`Existem ${filtered.length} usuários na sua base`}
        columns={["Nome", "E-mail", "Papel", "Ações"]}
        emptyMessage="Não existem usuários salvos na sua base."
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        error={error}
      >
        {filtered.map((user: User) => (
          <tr key={user._id} className="border-t border-charcoal/5">
            <td className="px-4 py-3 font-medium">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-tan/10 text-[11px] font-semibold text-tan">
                  {getInitials(user.name)}
                </div>
                {user.name}
              </div>
            </td>
            <td className="px-4 py-3">{user.email}</td>
            <td className="px-4 py-3">{USER_ROLE_LABELS[user.role]}</td>
            <td className="px-4 py-3">
              <button type="button" className="text-sm text-burgundy" onClick={() => void handleDelete(user)}>Excluir</button>
            </td>
          </tr>
        ))}
      </ListWorkspace>

      <Modal open={modalOpen} title="Novo usuário" onClose={() => setModalOpen(false)} footer={<button type="submit" form="user-form" className="btn-primary">Salvar</button>}>
        <form id="user-form" onSubmit={handleSubmit}>
          <FormField label="Nome"><input className="input-search" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></FormField>
          <FormField label="E-mail"><input className="input-search" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></FormField>
          <FormField label="Senha"><input className="input-search" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></FormField>
          <FormField label="Papel">
            <Select
              value={form.role}
              onChange={(role) => setForm({ ...form, role: role as UserRole })}
              options={[
                { value: "admin", label: "Administrador" },
                { value: "manager", label: "Gestor" },
                { value: "seller", label: "Vendedor" },
              ]}
            />
          </FormField>
        </form>
      </Modal>
    </>
  );
}
