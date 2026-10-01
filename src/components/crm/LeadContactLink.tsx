import { useEffect, useState } from "react";
import ContactForm from "@/components/base/ContactForm";
import EntityPicker from "@/components/base/EntityPicker";
import Field from "@/components/tools/Field";
import Modal from "@/components/ui/Modal";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Contact, Lead } from "@/types";

interface LeadContactLinkProps {
  lead: Lead;
  onChange: (lead: Lead) => void;
  /** "button": botão cheio (negociação sem contato); "link": atalho discreto no título do cartão. */
  variant?: "button" | "link";
}

/** Vincula (ou troca) o contato da negociação: escolhe um existente ou cadastra na hora. */
export default function LeadContactLink({ lead, onChange, variant = "link" }: LeadContactLinkProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactId, setContactId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setContactId(lead.contactId || "");
    setError("");
    setLoading(true);
    resources.contacts
      .list()
      .then(setContacts)
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
    // Só recarrega ao abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function link(id: string) {
    setSaving(true);
    setError("");
    try {
      onChange(await resources.leads.update(lead._id, { contactId: id }));
      setOpen(false);
    } catch (err) {
      setError(apiError(err, "Não foi possível vincular o contato."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" className={variant === "button" ? "btn-secondary" : "text-sm font-semibold text-tan hover:underline"} onClick={() => setOpen(true)}>
        {lead.contactId ? "Trocar" : "Vincular contato"}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={lead.contactId ? "Trocar contato" : "Vincular contato"}
        description="Escolha um contato da base ou cadastre um novo sem sair da negociação."
        footer={
          <>
            {lead.contactId ? (
              <button type="button" className="btn-secondary mr-auto !text-burgundy" disabled={saving} onClick={() => void link("")}>
                Desvincular
              </button>
            ) : null}
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" disabled={saving || !contactId || contactId === lead.contactId} onClick={() => void link(contactId)}>
              {saving ? "Salvando..." : "Vincular"}
            </button>
          </>
        }
      >
        <div className="pt-1">
          <Field label="Contato" group>
            <EntityPicker
              items={contacts.map((contact) => ({ id: contact._id, label: contact.name, sublabel: contact.phone || contact.email, image: contact.photo }))}
              value={contactId}
              onChange={setContactId}
              loading={loading}
              placeholder="Buscar contato"
              addLabel="Criar contato"
              onAdd={() => setFormOpen(true)}
            />
          </Field>
          {error ? <p className="mt-3 text-sm font-medium text-burgundy">{error}</p> : null}
        </div>
      </Modal>

      <ContactForm
        open={formOpen}
        contact={null}
        allowReuse
        initial={{ kinds: ["lead"], companyId: lead.companyId || "" }}
        onClose={() => setFormOpen(false)}
        onSaved={(contact) => {
          setFormOpen(false);
          void link(contact._id);
        }}
      />
    </>
  );
}
