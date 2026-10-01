import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import ContactForm from "@/components/base/ContactForm";
import ProfileHeader, { InfoList } from "@/components/base/ProfileHeader";
import PixKey from "@/components/base/PixKey";
import ProfileHistory from "@/components/base/ProfileHistory";
import RelationsCard from "@/components/base/RelationsCard";
import SendNpsDialog from "@/components/nps/SendNpsDialog";
import { useCustomFieldDisplay } from "@/components/options/CustomFieldsInputs";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { ContactProfile } from "@/types";
import { formatDate, formatDateOnly, formatDateTime, instagramLink, whatsappLink } from "@/utils/format";
import { confirmDialog } from "@/components/ui/DialogHost";

/** O primeiro contato é o que veio antes: o cadastro na base ou a primeira negociação. */
function firstContactAt(createdAt: string, firstLeadAt?: string | null) {
  return firstLeadAt && firstLeadAt < createdAt ? firstLeadAt : createdAt;
}

export default function ContactProfilePage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const { can } = useAuth();
  const { labelOf } = useWorkspace();
  const [profile, setProfile] = useState<ContactProfile | null>(null);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [npsOpen, setNpsOpen] = useState(false);
  const customDisplay = useCustomFieldDisplay("contact", profile?.contact.custom);

  function load() {
    resources.contacts
      .profile(id)
      .then(setProfile)
      .catch((err) => setError(apiError(err, "Contato não encontrado.")));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void (id && load()), [id]);

  if (error) return <p className="card p-6 text-sm text-burgundy">{error}</p>;
  if (!profile) return <div className="skeleton h-96" />;
  const { contact } = profile;
  const companies = profile.companies || (profile.company ? [profile.company] : []);

  async function setAffinity(affinity: number) {
    const saved = await resources.contacts.update(contact._id, { affinity });
    setProfile((current) => (current ? { ...current, contact: saved } : current));
  }

  async function handleDelete() {
    if (!(await confirmDialog({ title: `Excluir o contato ${contact.name}?`, message: "As negociações dele continuam no CRM.", confirmLabel: "Excluir", danger: true }))) return;
    await resources.contacts.remove(contact._id);
    void router.push("/contatos");
  }

  const age = contact.birthDate ? Math.floor((Date.now() - new Date(`${contact.birthDate}T12:00:00`).getTime()) / 31557600000) : null;

  return (
    <>
      <Head>
        <title>{`${contact.name} | Base de dados | Noma`}</title>
      </Head>
      <ProfileHeader
        backHref="/contatos"
        backLabel="Base geral"
        name={contact.name}
        image={contact.photo}
        affinity={contact.affinity}
        onAffinity={(value) => void setAffinity(value)}
        subtitle={
          <>
            {contact.jobRole ? labelOf("jobRole", contact.jobRole) : "Contato"}
            {companies.map((company) => (
              <span key={company._id}>
                {" · "}
                <Link href={`/empresas/${company._id}`} className="font-medium text-tan hover:underline">
                  {company.name}
                </Link>
              </span>
            ))}
          </>
        }
        chips={contact.kinds.map((kind) => (
          <span key={kind} className="chip bg-tan/10 text-tan">
            {labelOf("relationship", kind)}
          </span>
        ))}
        actions={
          <>
            {can("crm") ? (
              <Link href={`/crm?novo=1&contato=${contact._id}${contact.companyId ? `&empresa=${contact.companyId}` : ""}`} className="btn-secondary">
                Nova negociação
              </Link>
            ) : null}
            {can("nps", "crm", "base") ? (
              <button type="button" className="btn-secondary" onClick={() => setNpsOpen(true)}>
                Enviar NPS
              </button>
            ) : null}
            <button type="button" className="btn-primary" onClick={() => setEditOpen(true)}>
              Editar perfil
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
            <h2 className="mb-2 text-base font-semibold text-charcoal">Perfil</h2>
            <InfoList
              items={[
                ...(contact.fullName ? [{ label: "Nome completo", value: contact.fullName }] : []),
                ...(contact.nickname ? [{ label: "Apelido", value: contact.nickname }] : []),
                {
                  label: "Telefone",
                  value: contact.phone ? (
                    <a href={whatsappLink(contact.phone)} target="_blank" rel="noreferrer" className="text-tan hover:underline">
                      {contact.phone}
                    </a>
                  ) : null,
                },
                { label: "E-mail", value: contact.email ? <a href={`mailto:${contact.email}`} className="text-tan hover:underline">{contact.email}</a> : null },
                {
                  label: "Instagram",
                  value: contact.instagram ? (
                    <a href={instagramLink(contact.instagram)} target="_blank" rel="noreferrer" className="text-tan hover:underline">
                      {contact.instagram}
                    </a>
                  ) : null,
                },
                { label: "CPF", value: contact.cpf },
                { label: "Nascimento", value: contact.birthDate ? `${formatDateOnly(contact.birthDate)}${age !== null ? ` (${age} anos)` : ""}` : null },
                { label: "Localização", value: contact.location },
                { label: "Origem do lead", value: contact.leadSource ? labelOf("leadSource", contact.leadSource) : null },
                {
                  label: companies.length > 1 ? "Empresas" : "Empresa",
                  value: companies.length ? (
                    <span className="flex flex-col items-end gap-0.5">
                      {companies.map((company) => (
                        <Link key={company._id} href={`/empresas/${company._id}`} className="text-tan hover:underline">
                          {company.name}
                        </Link>
                      ))}
                    </span>
                  ) : null,
                },
                { label: "Nicho", value: contact.niche ? labelOf("niche", contact.niche) : null },
                ...(contact.supplierCategory ? [{ label: "Categoria", value: labelOf("supplierCategory", contact.supplierCategory) }] : []),
                ...(contact.pixKey ? [{ label: "Chave PIX", value: <PixKey value={contact.pixKey} /> }] : []),
                ...customDisplay,
              ]}
            />
            {contact.notes ? <p className="mt-4 whitespace-pre-line rounded-lg bg-beige px-3 py-2 text-sm text-charcoal/75">{contact.notes}</p> : null}
            <h2 className="mb-2 mt-6 text-base font-semibold text-charcoal">Informações do sistema</h2>
            <InfoList
              items={[
                { label: "Primeiro contato", value: formatDate(firstContactAt(contact.createdAt, profile.system?.firstLeadAt)) },
                { label: "Última interação", value: profile.system?.lastInteractionAt ? formatDateTime(profile.system.lastInteractionAt) : null },
                { label: "Criado em", value: formatDateTime(contact.createdAt) },
                { label: "Atualizado em", value: formatDateTime(contact.updatedAt) },
              ]}
            />
          </section>
          <RelationsCard kind="contact" id={contact._id} />
        </aside>
        <ProfileHistory history={profile} />
      </div>

      <SendNpsDialog open={npsOpen} onClose={() => setNpsOpen(false)} contactId={contact._id} />
      <ContactForm
        open={editOpen}
        contact={contact}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          load();
        }}
      />
    </>
  );
}
