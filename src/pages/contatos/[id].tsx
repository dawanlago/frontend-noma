import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import ContactForm from "@/components/base/ContactForm";
import ProfileHeader, { InfoList } from "@/components/base/ProfileHeader";
import ProfileHistory from "@/components/base/ProfileHistory";
import SendNpsDialog from "@/components/nps/SendNpsDialog";
import { useCustomFieldDisplay } from "@/components/options/CustomFieldsInputs";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { ContactProfile } from "@/types";
import { formatDateOnly, instagramLink, whatsappLink } from "@/utils/format";

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
  const { contact, company } = profile;

  async function setAffinity(affinity: number) {
    const saved = await resources.contacts.update(contact._id, { affinity });
    setProfile((current) => (current ? { ...current, contact: saved } : current));
  }

  async function handleDelete() {
    if (!window.confirm(`Excluir o contato ${contact.name}? As negociações continuam no CRM.`)) return;
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
            {company ? (
              <>
                {" · "}
                <Link href={`/empresas/${company._id}`} className="font-medium text-tan hover:underline">
                  {company.name}
                </Link>
              </>
            ) : null}
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
                Nova venda
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
        <aside className="card self-start p-5 sm:p-6">
          <h2 className="mb-2 text-base font-semibold text-charcoal">Perfil</h2>
          <InfoList
            items={[
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
              { label: "Nicho", value: contact.niche ? labelOf("niche", contact.niche) : null },
              ...(contact.supplierCategory ? [{ label: "Categoria", value: labelOf("supplierCategory", contact.supplierCategory) }] : []),
              ...customDisplay,
            ]}
          />
          {contact.notes ? <p className="mt-4 whitespace-pre-line rounded-lg bg-beige px-3 py-2 text-sm text-charcoal/75">{contact.notes}</p> : null}
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
