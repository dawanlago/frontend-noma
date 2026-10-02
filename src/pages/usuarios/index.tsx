import { useMemo, useState } from "react";
import Head from "next/head";
import { HiChevronDown } from "react-icons/hi2";
import { OrgBadge } from "@/components/layout/OrgSwitcher";
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
import type { AccessLevel, ModuleKey, OrgSummary, User, UserRole } from "@/types";
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
const allowedCount = (access: Access) => ALL_MODULE_KEYS.filter((key) => access[key] !== "none").length;

/** Acesso da pessoa a uma empresa, no formulário. */
interface OrgAccess {
  enabled: boolean;
  role: UserRole;
  access: Access;
}

interface UserDraft {
  name: string;
  email: string;
  password: string;
  isActive: boolean;
  /** Uma entrada por empresa que o administrador gerencia. */
  orgs: Record<string, OrgAccess>;
}

const LEVELS: { value: AccessLevel; label: string }[] = [
  { value: "none", label: "Sem acesso" },
  { value: "own", label: "Só os dele" },
  { value: "all", label: "Todos" },
];

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gestor" },
  { value: "seller", label: "Vendedor" },
];

function summary(item: OrgAccess) {
  if (item.role === "admin") return "Administrador · acesso a tudo";
  return `${USER_ROLE_LABELS[item.role]} · ${allowedCount(item.access)} de ${ALL_MODULE_KEYS.length} áreas`;
}

/** Níveis por área de uma empresa. */
function AccessEditor({ value, onChange }: { value: Access; onChange: (next: Access) => void }) {
  return (
    <ul className="divide-y divide-charcoal/[0.06] rounded-lg border border-charcoal/10 bg-surface">
      {MODULES.map((item) => {
        const level = value[item.key] || "none";
        const scoped = SCOPED_MODULES.includes(item.key);
        // Sem "dono" de registro: só bloqueado ou liberado.
        const options = scoped ? LEVELS : [LEVELS[0], { value: "all" as AccessLevel, label: "Com acesso" }];
        const current = !scoped && level === "own" ? "all" : level;
        return (
          <li key={item.key} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
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
                    onClick={() => onChange({ ...value, [item.key]: option.value })}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      active ? (option.value === "none" ? "bg-surface text-charcoal/70 shadow-soft" : "bg-surface text-tan shadow-soft") : "text-charcoal/50 hover:text-charcoal"
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
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  // Empresas que eu administro: são as que posso liberar para a equipe.
  const managed = useMemo<OrgSummary[]>(() => (me?.orgs || []).filter((org) => org.role === "admin"), [me]);
  const { data: users, isLoading, error, reload } = useAsyncData(() => resources.users.list({ scope: "managed" }));
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [form, setForm] = useState<UserDraft>({ name: "", email: "", password: "", isActive: true, orgs: {} });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users || [];
    return (users || []).filter((user) => user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term));
  }, [users, search]);

  function openCreate() {
    // Um cadastro só: a pessoa já entra em todas as empresas que eu administro.
    const orgs = Object.fromEntries(managed.map((org) => [org._id, { enabled: true, role: "seller" as UserRole, access: roleDefaults("seller") }]));
    setForm({ name: "", email: "", password: "", isActive: true, orgs });
    setExpanded(null);
    setFormError("");
    setModal({ open: true, user: null });
  }

  function openEdit(user: User) {
    const orgs = Object.fromEntries(
      managed.map((org) => {
        const membership = user.memberships?.find((item) => item.orgId === org._id);
        return [
          org._id,
          membership
            ? { enabled: true, role: membership.role, access: { ...roleDefaults(membership.role), ...membership.access } }
            : { enabled: false, role: "seller" as UserRole, access: roleDefaults("seller") },
        ];
      }),
    );
    setForm({ name: user.name, email: user.email, password: "", isActive: user.isActive, orgs });
    setExpanded(null);
    setFormError("");
    setModal({ open: true, user });
  }

  const patchOrg = (orgId: string, change: Partial<OrgAccess>) =>
    setForm((current) => ({ ...current, orgs: { ...current.orgs, [orgId]: { ...current.orgs[orgId], ...change } } }));

  /** Copia o papel e os acessos de uma empresa para todas as outras marcadas. */
  function applyToAll(orgId: string) {
    setForm((current) => {
      const source = current.orgs[orgId];
      return {
        ...current,
        orgs: Object.fromEntries(
          Object.entries(current.orgs).map(([id, item]) => [id, item.enabled ? { ...item, role: source.role, access: { ...source.access } } : item]),
        ),
      };
    });
  }

  async function handleSave() {
    const selected = managed.filter((org) => form.orgs[org._id]?.enabled);
    const superAdmin = modal.user?.isSuperAdmin;
    if (!form.email.trim() || !form.name.trim()) return setFormError("Preencha nome e e-mail.");
    if (!superAdmin && !selected.length) return setFormError("Marque pelo menos uma empresa.");
    const empty = selected.find((org) => form.orgs[org._id].role !== "admin" && !allowedCount(form.orgs[org._id].access));
    if (!superAdmin && empty) return setFormError(`Em ${empty.name}, libere pelo menos uma área (ou desmarque a empresa).`);
    setIsSaving(true);
    setFormError("");
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password || undefined,
        isActive: form.isActive,
        ...(superAdmin ? {} : { memberships: selected.map((org) => ({ orgId: org._id, role: form.orgs[org._id].role, access: form.orgs[org._id].access })) }),
      };
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
        title: `Remover ${user.name}?`,
        message:
          managed.length > 1
            ? "Ele perde o acesso a todas as suas empresas. Para tirar só de uma, use Editar e desmarque a empresa. Os registros dele continuam."
            : "Ele perde o acesso ao sistema. Os registros dele continuam.",
        confirmLabel: "Remover",
        danger: true,
      }))
    )
      return;
    await resources.users.remove(user._id);
    await reload();
  }

  const orgNames = (user: User) => {
    if (user.isSuperAdmin) return "Todas";
    const names = managed.filter((org) => user.memberships?.some((item) => item.orgId === org._id)).map((org) => org.name);
    return names.length === managed.length && managed.length > 1 ? `Todas (${names.length})` : names.join(", ") || "—";
  };

  return (
    <>
      <Head>
        <title>Usuários | Noma</title>
      </Head>
      <ListWorkspace
        title="Usuários e acessos"
        actionLabel="Inserir usuário"
        onAction={openCreate}
        countLabel={`${filtered.length} usuário${filtered.length === 1 ? "" : "s"}${managed.length > 1 ? ` nas suas ${managed.length} empresas` : ""}`}
        columns={["Nome", "E-mail", "Empresas", "Ações"]}
        emptyMessage="Nenhum usuário cadastrado."
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        error={error}
      >
        {filtered.length
          ? filtered.map((user: User) => (
              <tr key={user._id} className="border-t border-charcoal/5">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-tan/10 text-[11px] font-semibold text-tan">{getInitials(user.name)}</div>
                    <span>
                      {user.name}
                      {user.isSuperAdmin ? <span className="chip ml-2 bg-tan/10 text-tan">Administrador geral</span> : null}
                      {!user.isActive ? <span className="chip ml-2 bg-charcoal/[0.06] text-charcoal/50">Inativo</span> : null}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3 text-sm text-charcoal/65">{orgNames(user)}</td>
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
            ))
          : null}
      </ListWorkspace>

      <Modal
        variant="drawer"
        open={modal.open}
        size="lg"
        title={modal.user ? "Editar usuário" : "Novo usuário"}
        description="Um cadastro só por pessoa: marque as empresas em que ela trabalha e ajuste o que pode acessar em cada uma."
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
          <Field label={modal.user ? "Nova senha" : "Senha"} hint={modal.user ? "Deixe em branco para manter a atual." : "A pessoa pode trocar depois em Alterar senha."} full>
            <input className="input-search" type="password" value={form.password} autoComplete="new-password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          {modal.user && modal.user._id !== me?._id ? (
            <label className="flex items-center gap-2 text-sm font-semibold text-charcoal sm:col-span-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Usuário ativo (desmarque para bloquear o acesso a tudo)
            </label>
          ) : null}

          <div className="sm:col-span-2">
            <p className="mb-2 text-[13px] font-semibold text-charcoal">Empresas e acessos</p>
            {modal.user?.isSuperAdmin ? (
              <p className="rounded-lg bg-beige px-3 py-2 text-sm text-charcoal/60">O administrador geral é administrador em todas as empresas.</p>
            ) : (
              <ul className="grid gap-2">
                {managed.map((org) => {
                  const item = form.orgs[org._id];
                  if (!item) return null;
                  const open = expanded === org._id && item.enabled;
                  return (
                    <li key={org._id} className={`rounded-xl border transition ${item.enabled ? "border-tan/30 bg-tan/[0.03]" : "border-charcoal/10"}`}>
                      <div className="flex flex-wrap items-center gap-3 p-3">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                          <input type="checkbox" checked={item.enabled} aria-label={`Acesso a ${org.name}`} onChange={(e) => patchOrg(org._id, { enabled: e.target.checked })} />
                          <OrgBadge org={org} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-charcoal">{org.name}</span>
                            <span className="block text-xs text-charcoal/55">{item.enabled ? summary(item) : "Sem acesso a esta empresa"}</span>
                          </span>
                        </label>
                        {item.enabled ? (
                          <>
                            <div className="w-40">
                              <Select
                                value={item.role}
                                onChange={(role) => patchOrg(org._id, { role: role as UserRole, access: roleDefaults(role as UserRole) })}
                                options={ROLE_OPTIONS}
                              />
                            </div>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-tan hover:underline"
                              aria-expanded={open}
                              onClick={() => setExpanded(open ? null : org._id)}
                            >
                              Acessos <HiChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                            </button>
                          </>
                        ) : null}
                      </div>
                      {open ? (
                        <div className="border-t border-charcoal/[0.06] p-3">
                          {item.role === "admin" ? (
                            <p className="rounded-lg bg-beige px-3 py-2 text-sm text-charcoal/60">Administradores têm acesso a todas as áreas e veem os registros de todos.</p>
                          ) : (
                            <>
                              <div className="mb-2 flex flex-wrap justify-end gap-3 text-xs font-semibold">
                                <button type="button" className="text-tan hover:underline" onClick={() => patchOrg(org._id, { access: everything("all") })}>
                                  Liberar tudo
                                </button>
                                <button type="button" className="text-charcoal/50 hover:underline" onClick={() => patchOrg(org._id, { access: everything("none") })}>
                                  Bloquear tudo
                                </button>
                              </div>
                              <AccessEditor value={item.access} onChange={(access) => patchOrg(org._id, { access })} />
                            </>
                          )}
                          {managed.length > 1 ? (
                            <button type="button" className="btn-secondary mt-3 !py-1.5 text-xs" onClick={() => applyToAll(org._id)}>
                              Usar este papel e estes acessos em todas as empresas marcadas
                            </button>
                          ) : null}
                        </div>
                      ) : null}
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
