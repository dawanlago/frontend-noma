import { useMemo, useState } from "react";
import Head from "next/head";
import Field from "@/components/tools/Field";
import ListWorkspace from "@/components/ui/ListWorkspace";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { apiError } from "@/lib/errors";
import { ALL_MODULE_KEYS, MODULES } from "@/lib/modules";
import { resources } from "@/lib/resources";
import { getInitials } from "@/utils/format";
import type { ModuleKey, User, UserRole } from "@/types";
import { confirmDialog } from "@/components/ui/DialogHost";

/** Acessos sugeridos por papel (mesma regra do servidor). */
const ROLE_DEFAULTS: Record<UserRole, ModuleKey[]> = {
  admin: ALL_MODULE_KEYS,
  manager: ALL_MODULE_KEYS.filter((key) => key !== "configuracoes"),
  seller: ALL_MODULE_KEYS.filter((key) => key !== "configuracoes" && key !== "financeiro"),
};

interface UserDraft {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  permissions: ModuleKey[];
}

const emptyDraft = (): UserDraft => ({ name: "", email: "", password: "", role: "seller", isActive: true, permissions: ROLE_DEFAULTS.seller });

function effective(user: User): ModuleKey[] {
  if (user.role === "admin") return ALL_MODULE_KEYS;
  return user.permissions?.length ? user.permissions : ROLE_DEFAULTS[user.role];
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const { data: users, isLoading, error, reload } = useAsyncData(() => resources.users.list());
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [form, setForm] = useState<UserDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users || [];
    return (users || []).filter((user) => user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term));
  }, [users, search]);

  function openCreate() {
    setForm(emptyDraft());
    setFormError("");
    setModal({ open: true, user: null });
  }

  function openEdit(user: User) {
    setForm({ name: user.name, email: user.email, password: "", role: user.role, isActive: user.isActive, permissions: effective(user) });
    setFormError("");
    setModal({ open: true, user });
  }

  function togglePermission(key: ModuleKey) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(key) ? current.permissions.filter((item) => item !== key) : [...current.permissions, key],
    }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim() || (!modal.user && !form.password)) {
      setFormError("Preencha nome, e-mail e senha.");
      return;
    }
    if (form.role !== "admin" && !form.permissions.length) {
      setFormError("Marque pelo menos uma área de acesso.");
      return;
    }
    setIsSaving(true);
    setFormError("");
    try {
      const payload = { ...form, password: form.password || undefined };
      if (modal.user) await resources.users.update(modal.user._id, payload);
      else await resources.users.create(payload);
      setModal({ open: false, user: null });
      await reload();
    } catch (err) {
      setFormError(apiError(err, "Não foi possível salvar o usuário."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(user: User) {
    if (!(await confirmDialog({ title: `Excluir o usuário ${user.name}?`, message: "Ele perde o acesso ao sistema. Os registros dele continuam.", confirmLabel: "Excluir", danger: true }))) return;
    await resources.users.remove(user._id);
    await reload();
  }

  const isAdminRole = form.role === "admin";

  return (
    <>
      <Head>
        <title>Usuários | Noma</title>
      </Head>
      <ListWorkspace
        title="Usuários e acessos"
        actionLabel="Inserir usuário"
        onAction={openCreate}
        countLabel={`Existem ${filtered.length} usuários na sua base`}
        columns={["Nome", "E-mail", "Papel", "Acessos", "Ações"]}
        emptyMessage="Não existem usuários salvos na sua base."
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        error={error}
      >
        {filtered.length
          ? filtered.map((user: User) => {
              const allowed = effective(user);
              return (
                <tr key={user._id} className="border-t border-charcoal/5">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-tan/10 text-[11px] font-semibold text-tan">
                        {getInitials(user.name)}
                      </div>
                      <span>
                        {user.name}
                        {!user.isActive ? <span className="chip ml-2 bg-charcoal/[0.06] text-charcoal/50">Inativo</span> : null}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{USER_ROLE_LABELS[user.role]}</td>
                  <td className="px-4 py-3 text-sm text-charcoal/65">
                    {user.role === "admin" ? "Tudo" : `${allowed.length} de ${ALL_MODULE_KEYS.length} áreas`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button type="button" className="text-sm text-tan" onClick={() => openEdit(user)}>
                        Editar
                      </button>
                      {user._id !== me?._id ? (
                        <button type="button" className="text-sm text-burgundy" onClick={() => void handleDelete(user)}>
                          Excluir
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })
          : null}
      </ListWorkspace>

      <Modal
        variant="drawer"
        open={modal.open}
        size="lg"
        title={modal.user ? "Editar usuário" : "Novo usuário"}
        description="Escolha o papel e as áreas do sistema que esta pessoa pode acessar."
        onClose={() => setModal({ open: false, user: null })}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal({ open: false, user: null })}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" disabled={isSaving} onClick={() => void handleSave()}>
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form
          className="grid gap-4 pt-1 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <Field label="Nome">
            <input className="input-search" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="E-mail">
            <input className="input-search" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label={modal.user ? "Nova senha" : "Senha"} hint={modal.user ? "Deixe em branco para manter a atual." : undefined}>
            <input className="input-search" type="password" value={form.password} autoComplete="new-password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Papel" hint="Administradores veem os dados de todos e acessam tudo.">
            <Select
              value={form.role}
              onChange={(role) => setForm({ ...form, role: role as UserRole, permissions: ROLE_DEFAULTS[role as UserRole] })}
              options={[
                { value: "admin", label: "Administrador" },
                { value: "manager", label: "Gestor" },
                { value: "seller", label: "Vendedor" },
              ]}
            />
          </Field>
          {modal.user && modal.user._id !== me?._id ? (
            <label className="flex items-center gap-2 text-sm font-semibold text-charcoal sm:col-span-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Usuário ativo (desmarque para bloquear o acesso)
            </label>
          ) : null}

          <div className="sm:col-span-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-charcoal">Acessos</p>
              {!isAdminRole ? (
                <div className="flex gap-3 text-xs font-semibold">
                  <button type="button" className="text-tan hover:underline" onClick={() => setForm({ ...form, permissions: ALL_MODULE_KEYS })}>
                    Marcar tudo
                  </button>
                  <button type="button" className="text-charcoal/50 hover:underline" onClick={() => setForm({ ...form, permissions: [] })}>
                    Desmarcar tudo
                  </button>
                </div>
              ) : null}
            </div>
            {isAdminRole ? (
              <p className="rounded-lg bg-beige px-3 py-2 text-sm text-charcoal/60">Administradores têm acesso a todas as áreas.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {MODULES.map((item) => {
                  const checked = form.permissions.includes(item.key);
                  return (
                    <label
                      key={item.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                        checked ? "border-tan/40 bg-tan/[0.04]" : "border-charcoal/10"
                      }`}
                    >
                      <input type="checkbox" className="mt-0.5" checked={checked} onChange={() => togglePermission(item.key)} />
                      <span>
                        <span className="block text-sm font-semibold text-charcoal">{item.label}</span>
                        <span className="block text-xs text-charcoal/55">{item.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          {formError ? <p className="text-sm text-burgundy sm:col-span-2">{formError}</p> : null}
          <button type="submit" className="hidden" aria-hidden />
        </form>
      </Modal>
    </>
  );
}
