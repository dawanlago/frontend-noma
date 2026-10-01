import { useState } from "react";
import Head from "next/head";
import LogoUpload from "@/components/contracts/LogoUpload";
import { OrgBadge } from "@/components/layout/OrgSwitcher";
import SettingsHeader from "@/components/settings/SettingsHeader";
import Field from "@/components/tools/Field";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import { normalizeHex } from "@/theme/appearance";
import type { OrgSummary } from "@/types";

interface Draft {
  name: string;
  logo: string;
  color: string;
  copyFrom: string;
  isActive: boolean;
}

/** Empresas do grupo: cada uma com dados, funis e financeiro separados (só o administrador geral). */
export default function OrganizationsPage() {
  const { user, switchOrg } = useAuth();
  const { data, isLoading, error, reload } = useAsyncData(() => resources.orgs.list());
  const [editing, setEditing] = useState<{ org: OrgSummary | null; draft: Draft } | null>(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const orgs = data || [];

  if (user && !user.isSuperAdmin) return <p className="card p-6 text-sm text-charcoal/60">Só o administrador geral gerencia as empresas.</p>;

  function openNew() {
    setFormError("");
    setEditing({ org: null, draft: { name: "", logo: "", color: "", copyFrom: user?.orgId || "", isActive: true } });
  }

  function openEdit(org: OrgSummary) {
    setFormError("");
    setEditing({ org, draft: { name: org.name, logo: org.logo || "", color: org.color || "", copyFrom: "", isActive: org.isActive !== false } });
  }

  async function save() {
    if (!editing) return;
    const { org, draft } = editing;
    const color = draft.color.trim() ? normalizeHex(draft.color) : "";
    if (!draft.name.trim()) return setFormError("Informe o nome da empresa.");
    if (draft.color.trim() && !color) return setFormError("Cor inválida: use o formato #RRGGBB.");
    setBusy(true);
    setFormError("");
    try {
      if (org) await resources.orgs.update(org._id, { name: draft.name.trim(), logo: draft.logo, color, isActive: draft.isActive });
      else await resources.orgs.create({ name: draft.name.trim(), logo: draft.logo, color, copyFrom: draft.copyFrom || undefined });
      setEditing(null);
      await reload();
    } catch (err) {
      setFormError(apiError(err, "Não foi possível salvar a empresa."));
    } finally {
      setBusy(false);
    }
  }

  const patch = (change: Partial<Draft>) => setEditing((current) => (current ? { ...current, draft: { ...current.draft, ...change } } : current));

  return (
    <>
      <Head>
        <title>Empresas do grupo | Configurações | Noma</title>
      </Head>
      <SettingsHeader
        title="Empresas do grupo"
        description="Cada empresa tem seus próprios contatos, funis, negociações, propostas, orçamentos e financeiro. Os acessos de cada pessoa são definidos por empresa, em Usuários."
        actions={
          <button type="button" className="btn-primary" onClick={openNew}>
            Nova empresa
          </button>
        }
      />
      {error ? <p className="mb-4 rounded-lg bg-burgundy/[0.06] px-4 py-3 text-sm text-burgundy">{error}</p> : null}
      <section className="card divide-y divide-charcoal/[0.06]">
        {isLoading && !data ? <div className="skeleton m-5 h-16" /> : null}
        {orgs.map((org) => {
          const active = org._id === user?.orgId;
          return (
            <div key={org._id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <OrgBadge org={org} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-charcoal">{org.name}</p>
                <p className="text-xs text-charcoal/50">
                  {org.isActive === false ? "Inativa — ninguém consegue abrir" : active ? "Você está nesta empresa" : "Ativa"}
                </p>
              </div>
              {!active && org.isActive !== false ? (
                <button type="button" className="btn-secondary" onClick={() => switchOrg(org._id)}>
                  Abrir
                </button>
              ) : null}
              <button type="button" className="btn-secondary" onClick={() => openEdit(org)}>
                Editar
              </button>
            </div>
          );
        })}
      </section>

      <Modal
        open={Boolean(editing)}
        title={editing?.org ? "Editar empresa" : "Nova empresa"}
        description={editing?.org ? undefined : "A empresa nasce vazia de contatos, negociações e financeiro. Você entra nela como administrador."}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>
              {busy ? "Salvando..." : editing?.org ? "Salvar" : "Criar empresa"}
            </button>
          </>
        }
      >
        {editing ? (
          <div className="grid gap-4 pt-1">
            <Field label="Nome">
              <input className="input-search" autoFocus value={editing.draft.name} placeholder="Ex.: Brava" onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field label="Logo" hint="Opcional. Aparece no seletor de empresas." group>
              <LogoUpload folder="marca" value={editing.draft.logo} onChange={(logo) => patch({ logo })} />
            </Field>
            <Field label="Cor" hint="Usada quando não há logo.">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Seletor de cor"
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-charcoal/15 bg-surface p-1"
                  value={normalizeHex(editing.draft.color) || "#0a74f0"}
                  onChange={(e) => patch({ color: e.target.value })}
                />
                <input className="input-search font-mono uppercase" value={editing.draft.color} maxLength={7} placeholder="#C8102E" aria-label="Cor em hexadecimal" onChange={(e) => patch({ color: e.target.value })} />
              </div>
            </Field>
            {editing.org ? (
              <label className="flex items-center gap-2 text-sm font-semibold text-charcoal">
                <input type="checkbox" checked={editing.draft.isActive} onChange={(e) => patch({ isActive: e.target.checked })} />
                Empresa ativa (desmarque para esconder de todos, sem apagar os dados)
              </label>
            ) : (
              <Field label="Começar com a configuração de" hint="Copia funis, listas de opções, campos personalizados e etiquetas. Contatos, negociações e financeiro não são copiados.">
                <Select
                  value={editing.draft.copyFrom}
                  onChange={(copyFrom) => patch({ copyFrom })}
                  options={[{ value: "", label: "Nenhuma (configuração padrão)" }, ...orgs.map((org) => ({ value: org._id, label: org.name }))]}
                />
              </Field>
            )}
            {formError ? <p className="text-sm text-burgundy">{formError}</p> : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
