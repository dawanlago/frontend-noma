import { useEffect, useState } from "react";
import EntityPicker from "@/components/base/EntityPicker";
import CopyButton from "@/components/tools/CopyButton";
import Field from "@/components/tools/Field";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { Contact, NPSInvite, NPSSurvey } from "@/types";
import { whatsappLink } from "@/utils/format";

interface SendNpsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Contato já definido (perfil, negociação); sem ele, escolhe na lista. */
  contactId?: string;
  leadId?: string;
}

export function npsUrl(token: string) {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/nps/responder/${token}`;
}

/** Gera o link único de NPS para um contato (reaproveita o link pendente). */
export default function SendNpsDialog({ open, onClose, contactId, leadId }: SendNpsDialogProps) {
  const [surveys, setSurveys] = useState<NPSSurvey[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [surveyId, setSurveyId] = useState("");
  const [contact, setContact] = useState(contactId || "");
  const [invite, setInvite] = useState<NPSInvite | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setInvite(null);
    setError("");
    setContact(contactId || "");
    resources.nps.surveys
      .list()
      .then((list) => {
        const active = list.filter((item) => item.isActive);
        setSurveys(active);
        setSurveyId(active[0]?._id || "");
      })
      .catch(() => setSurveys([]));
    if (!contactId) resources.contacts.list().then(setContacts).catch(() => setContacts([]));
  }, [open, contactId]);

  async function handleCreate() {
    if (!surveyId || !contact) {
      setError("Escolha a pesquisa e o contato.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setInvite(await resources.nps.invite({ surveyId, contactId: contact, leadId }));
    } catch (err) {
      setError(apiError(err, "Não foi possível gerar o link."));
    } finally {
      setBusy(false);
    }
  }

  const url = invite ? npsUrl(invite.token) : "";
  const message = invite ? `Olá, ${invite.contactName.split(" ")[0]}! Pode nos contar como foi a sua experiência? Leva menos de 1 minuto: ${url}` : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enviar pesquisa NPS"
      description="Gera um link único para o cliente responder. Cada link aceita uma resposta."
      footer={
        invite ? (
          <button type="button" className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
        ) : (
          <button type="button" className="btn-primary" disabled={busy || !surveys.length} onClick={() => void handleCreate()}>
            {busy ? "Gerando..." : "Gerar link"}
          </button>
        )
      }
    >
      {!surveys.length ? (
        <p className="text-sm text-charcoal/60">Nenhuma pesquisa ativa. Crie uma pesquisa na página NPS.</p>
      ) : invite ? (
        <div className="space-y-3">
          <p className="text-sm text-charcoal/65">
            Link de <strong>{invite.surveyName}</strong> para <strong>{invite.contactName}</strong>
            {invite.status === "answered" ? " (já respondido)" : ""}:
          </p>
          <p className="break-all rounded-lg bg-beige px-3 py-2 text-xs text-charcoal/70">{url}</p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={url} label="Copiar link" className="btn-primary" />
            <CopyButton text={message} label="Copiar mensagem" className="btn-secondary" />
            {invite.phone ? (
              <a
                href={`${whatsappLink(invite.phone)}?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                Enviar no WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 pt-1">
          <Field label="Pesquisa">
            <Select value={surveyId} onChange={setSurveyId} options={surveys.map((item) => ({ value: item._id, label: item.name }))} />
          </Field>
          {!contactId ? (
            <Field label="Contato" group>
              <EntityPicker
                items={contacts.map((item) => ({ id: item._id, label: item.name, sublabel: item.phone || item.email, image: item.photo }))}
                value={contact}
                onChange={setContact}
                placeholder="Buscar contato"
              />
            </Field>
          ) : null}
          {error ? <p className="text-sm text-burgundy">{error}</p> : null}
        </div>
      )}
    </Modal>
  );
}
