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
import { ALL_MODULE_KEYS, MODULES, SCOPED_MODULES } from "@/lib/modules";
import { resources } from "@/lib/resources";
import { getInitials } from "@/utils/format";
import type { AccessLevel, ModuleKey, User, UserRole } from "@/types";
import { confirmDialog } from "@/components/ui/DialogHost";

type Access = Record<ModuleKey, AccessLevel>;

/** Acesso sugerido por papel (mesma regra do servidor): admin vê tudo; os demais, só o que criaram. */
function roleDefaults(role: UserRole): Access {
  return Object.fromEntries(
    ALL_MODULE_KEYS.map((key) => {
      if (role === "admin") return [key, "all"];
      const blocked = key === "configuracoes" || (role === "seller" && key === "financeiro");
      // Módulos sem "dono" de registro são só liberado/bloqueado.
      return [key, blocked ? "none" : SCOPED_MODULES.includes(key) ? "own" : "all"];
    }),
  ) as Access;
}

const everything = (level: AccessLevel) => Object.fromEntries(ALL_MODULE_KEYS.map((key) => [key, level])) as Access;

interface UserDraft {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  access: Access;
}

const emptyDraft = (): UserDraft => ({ name: "", email: "", password: "", role: "seller", isActive: true, access: roleDefaults("seller") });

function accessOf(user: User): Access {
  return { ...roleDefaults(user.role), ...(user.access || {}) };
}

const allowedCount = (access: Access) => ALL_MODULE_KEYS.filter((key) => access[key] !== "none").length;

const LEVELS: { value: AccessLevel; label: string }[] = [
  { value: "none", label: "Sem acesso" },
  { value: "own", label: "Só os dele" },
  { value: "all", label: "Todos" },
];

export default function UsersPage() {
  const { user: me, org } = useAuth();
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
    setForm({ name: user.name, email: user.email, password: "", role: user.role, isActive: user.isActive, access: accessOf(user) });
    setFormError("");
    setModal({ open: true, user });
  }

  function setLevel(key: ModuleKey, level: AccessLevel) {
    setForm((current) => ({ ...current, access: { ...current.access, [key]: level } }));
  }

  async function handleSave() {
    if (!form.email.trim() || (!modal.user && !form.name.trim())) {
      setFormError("Preencha nome e e-mail.");
      return;
    }
    if (form.role !== "admin" && !allowedCount(form.access)) {
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
    if (
      !(await confirmDialog({
        title: `Remover ${user.name} de ${org?.name || "esta empresa"}?`,
        message: "Ele perde o acesso a esta empresa (continua nas outras em que estiver). Os registros dele continuam.",
        confirmLabel: "Remover",
        danger: true,
      }))
    )
      return;
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
        countLabel={`${filtered.length} usuário${filtered.length === 1 ? "" : "s"} com acesso a ${org?.name || "esta empresa"}`}
        columns={["Nome", "E-mail", "Papel", "Acessos", "Ações"]}
        emptyMessage="Não existem usuários salvos na sua base."
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        error={error}
      >
        {filtered.length
          ? filtered.map((user: User) => {
              const allowed = allowedCount(accessOf(user));
              return (
                <tr key={user._id} className="border-t border-charcoal/5">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-tan/10 text-[11px] font-semibold text-tan">
                        {getInitials(user.name)}
                      </div>
                      <span>
                        {user.name}
                        {user.isSuperAdmin ? <span className="chip ml-2 bg-tan/10 text-tan">Administrador geral</span> : null}
                        {!user.isActive ? <span className="chip ml-2 bg-charcoal/[0.06] text-charcoal/50">Inativo</span> : null}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{USER_ROLE_LABELS[user.role]}</td>
                  <td className="px-4 py-3 text-sm text-charcoal/65">
                    {user.role === "admin" ? "Tudo" : `${allowed} de ${ALL_MODULE_KEYS.length} áreas`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button type="button" className="text-sm text-tan" onClick={() => openEdit(user)}>
                        Editar
                      </button>
                      {user._id !== me?._id && !user.isSuperAdmin ? (
                        <button type="button" className="text-sm text-burgundy" onClick={() => void handleDelete(user)}>
                          Remover
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
        description={`Acesso em ${org?.name || "esta empresa"}: escolha o papel e até onde esta pessoa enxerga em cada área. Em outras empresas o acesso é definido à parte.`}
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
          <Field
            label={modal.user ? "Nova senha" : "Senha"}
            hint={modal.user ? "Deixe em branco para manter a atual." : "Se o e-mail já for de alguém de outra empresa do grupo, a pessoa só ganha acesso a esta e mantém a senha dela."}
          >
            <input className="input-search" type="password" value={form.password} autoComplete="new-password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Papel" hint="Administradores veem os dados de todos e acessam tudo nesta empresa.">
            <Select
              value={form.role}
              onChange={(role) => setForm({ ...form, role: role as UserRole, access: roleDefaults(role as UserRole) })}
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
                  <button type="button" className="text-tan hover:underline" onClick={() => setForm({ ...form, access: everything("all") })}>
                    Liberar tudo
                  </button>
                  <button type="button" className="text-charcoal/50 hover:underline" onClick={() => setForm({ ...form, access: everything("none") })}>
                    Bloquear tudo
                  </button>
                </div>
              ) : null}
            </div>
            {isAdminRole ? (
              <p className="rounded-lg bg-beige px-3 py-2 text-sm text-charcoal/60">Administradores têm acesso a todas as áreas e veem os registros de todos.</p>
            ) : (
              <ul className="divide-y divide-charcoal/[0.06] rounded-lg border border-charcoal/10">
                {MODULES.map((item) => {
                  const level = form.access[item.key] || "none";
                  const scoped = SCOPED_MODULES.includes(item.key);
                  // Sem "dono" de registro: só bloqueado ou liberado.
                  const options = scoped ? LEVELS : [LEVELS[0], { value: "all" as AccessLevel, label: "Com acesso" }];
                  const current = !scoped && level === "own" ? "all" : level;
                  return (
                    <li key={item.key} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-charcoal">{item.label}</span>
                        <span className="block text-xs text-charcoal/55">{item.description}</span>
                      </span>
                      <div role="radiogroup" aria-label={`Acesso a ${item.label}`} className="inline-flex shrink-0 gap-0.5 self-start rounded-lg bg-beige p-0.5 sm:self-auto">
                        {options.map((option) => {
                          const active = current === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => setLevel(item.key, option.value)}
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                active
                                  ? option.value === "none"
                                    ? "bg-surface text-charcoal/70 shadow-soft"
                                    : "bg-surface text-tan shadow-soft"
                                  : "text-charcoal/50 hover:text-charcoal"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {formError ? <p className="text-sm text-burgundy sm:col-span-2">{formError}</p> : null}
          <button type="submit" className="hidden" aria-hidden />
        </form>
      </Modal>
    </>
  );
}
