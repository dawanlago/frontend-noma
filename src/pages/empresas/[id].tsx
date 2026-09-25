import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import EntityAvatar from "@/components/base/Avatar";
import CompanyForm from "@/components/base/CompanyForm";
import ContactForm from "@/components/base/ContactForm";
import ProfileHeader, { InfoList } from "@/components/base/ProfileHeader";
import ProfileHistory from "@/components/base/ProfileHistory";
import { useCustomFieldDisplay } from "@/components/options/CustomFieldsInputs";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { CompanyProfile } from "@/types";
import { instagramLink } from "@/utils/format";

export default function CompanyProfilePage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const { can } = useAuth();
  const { labelOf } = useWorkspace();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<"edit" | "contact" | null>(null);
  const customDisplay = useCustomFieldDisplay("company", profile?.company.custom);

  function load() {
    resources.companies
      .profile(id)
      .then(setProfile)
      .catch((err) => setError(apiError(err, "Empresa não encontrada.")));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void (id && load()), [id]);

  if (error) return <p className="card p-6 text-sm text-burgundy">{error}</p>;
  if (!profile) return <div className="skeleton h-96" />;
  const { company, contacts } = profile;

  async function setAffinity(affinity: number) {
    const saved = await resources.companies.update(company._id, { affinity });
    setProfile((current) => (current ? { ...current, company: saved } : current));
  }

  async function handleDelete() {
    if (!window.confirm(`Excluir a empresa ${company.name}? Os contatos continuam na base, sem empresa.`)) return;
    await resources.companies.remove(company._id);
    void router.push("/empresas");
  }

  return (
    <>
      <Head>
        <title>{`${company.name} | Base de dados | Noma`}</title>
      </Head>
      <ProfileHeader
        backHref="/empresas"
        backLabel="Empresas"
        name={company.name}
        image={company.logo}
        square
        affinity={company.affinity}
        onAffinity={(value) => void setAffinity(value)}
        subtitle={company.taxId ? `CNPJ ${company.taxId}` : "Empresa"}
        chips={company.kinds.map((kind) => (
          <span key={kind} className="chip bg-tan/10 text-tan">
            {labelOf("relationship", kind)}
          </span>
        ))}
        actions={
          <>
            {can("crm") ? (
              <Link href={`/crm?novo=1&empresa=${company._id}`} className="btn-secondary">
                Nova venda
              </Link>
            ) : null}
            <button type="button" className="btn-primary" onClick={() => setDialog("edit")}>
              Editar empresa
            </button>
            {can("base") ? (
              <button type="button" className="btn-secondary !text-burgundy" onClick={() => void handleDelete()}>
                Excluir
              </button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-6 self-start">
          <section className="card p-5 sm:p-6">
            <h2 className="mb-2 text-base font-semibold text-charcoal">Dados</h2>
            <InfoList
              items={[
                { label: "E-mail", value: company.email },
                { label: "Telefone", value: company.phone },
                {
                  label: "Instagram",
                  value: company.instagram ? (
                    <a href={instagramLink(company.instagram)} target="_blank" rel="noreferrer" className="text-tan hover:underline">
                      {company.instagram}
                    </a>
                  ) : null,
                },
                {
                  label: "Site",
                  value: company.website ? (
                    <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="text-tan hover:underline">
                      {company.website}
                    </a>
                  ) : null,
                },
                { label: "Nicho", value: company.niche ? labelOf("niche", company.niche) : null },
                ...(company.supplierCategory ? [{ label: "Categoria", value: labelOf("supplierCategory", company.supplierCategory) }] : []),
                ...customDisplay,
              ]}
            />
            {company.notes ? <p className="mt-4 whitespace-pre-line rounded-lg bg-beige px-3 py-2 text-sm text-charcoal/75">{company.notes}</p> : null}
          </section>
          <section className="card p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-charcoal">Contatos vinculados</h2>
              <button type="button" className="text-sm font-semibold text-tan hover:underline" onClick={() => setDialog("contact")}>
                + Adicionar
              </button>
            </div>
            {contacts.length ? (
              <ul className="space-y-2">
                {contacts.map((contact) => (
                  <li key={contact._id}>
                    <Link href={`/contatos/${contact._id}`} className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-beige">
                      <EntityAvatar name={contact.name} image={contact.photo} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-charcoal">{contact.name}</span>
                        <span className="block truncate text-xs text-charcoal/50">{contact.jobRole ? labelOf("jobRole", contact.jobRole) : contact.phone || contact.email}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-charcoal/50">Nenhum contato vinculado.</p>
            )}
          </section>
        </aside>
        <div>
          <p className="mb-3 text-xs text-charcoal/50">O histórico inclui as negociações da empresa e dos contatos vinculados a ela.</p>
          <ProfileHistory history={profile} showCompany />
        </div>
      </div>

      <CompanyForm
        open={dialog === "edit"}
        company={company}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null);
          load();
        }}
      />
      <ContactForm
        open={dialog === "contact"}
        contact={null}
        initial={{ companyId: company._id, kinds: company.kinds }}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null);
          load();
        }}
      />
    </>
  );
}
