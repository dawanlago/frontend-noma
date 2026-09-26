import { useEffect, useState } from "react";
import Link from "next/link";
import CopyButton from "@/components/tools/CopyButton";
import Select from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { CaptureForm, FormInvite, Lead } from "@/types";
import { formatDateTime, whatsappLink } from "@/utils/format";

function inviteUrl(code: string) {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/f/${code}`;
}

/**
 * Formulários enviados na negociação: cada envio gera um link com código de
 * 6 dígitos, preenchido uma vez; as respostas ficam aqui.
 */
export default function LeadForms({ lead, phone }: { lead: Lead; phone?: string }) {
  const { can } = useAuth();
  const [forms, setForms] = useState<CaptureForm[]>([]);
  const [invites, setInvites] = useState<FormInvite[] | null>(null);
  const [formId, setFormId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    resources.forms
      .list()
      .then((list) => {
        const active = list.filter((form) => form.isActive);
        setForms(active);
        setFormId((current) => current || active[0]?._id || "");
      })
      .catch(() => setForms([]));
    resources.leads
      .formInvites(lead._id)
      .then(setInvites)
      .catch(() => setInvites([]));
  }, [lead._id]);

  const alreadyFilled = invites?.some((invite) => invite.formId === formId && invite.status === "submitted");

  async function handleSend() {
    if (!formId) return;
    setBusy(true);
    setError("");
    try {
      const invite = await resources.leads.sendForm(lead._id, formId);
      setInvites((current) => [invite, ...(current || []).filter((item) => item._id !== invite._id)]);
      setOpen(invite._id);
    } catch (err) {
      setError(apiError(err, "Não foi possível enviar o formulário."));
    } finally {
      setBusy(false);
    }
  }

  const message = (invite: FormInvite) =>
    `Olá${lead.contactName ? `, ${lead.contactName.split(" ")[0]}` : ""}! Pode preencher este formulário para seguirmos com o projeto? ${inviteUrl(invite.code)} (código ${invite.code})`;

  return (
    <div>
      <div className="rounded-xl border border-charcoal/10 bg-beige/40 p-4">
        <p className="mb-3 text-sm text-charcoal/60">
          O link usa um código de 6 dígitos ligado a esta negociação. Cada formulário é preenchido uma vez e as respostas aparecem aqui.
        </p>
        {forms.length ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1">
              <Select value={formId} onChange={setFormId} options={forms.map((form) => ({ value: form._id, label: form.name }))} />
            </div>
            <button type="button" className="btn-primary" disabled={busy || !formId || alreadyFilled} onClick={() => void handleSend()}>
              {busy ? "Gerando..." : "Enviar formulário"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-charcoal/55">
            Nenhum formulário ativo.{" "}
            {can("formularios") ? (
              <Link href="/formularios" className="font-semibold text-tan hover:underline">
                Criar formulário
              </Link>
            ) : null}
          </p>
        )}
        {alreadyFilled ? <p className="mt-2 text-xs text-charcoal/50">Este formulário já foi preenchido nesta negociação.</p> : null}
        {error ? <p className="mt-2 text-sm text-burgundy">{error}</p> : null}
      </div>

      {invites === null ? (
        <div className="skeleton mt-4 h-14" />
      ) : invites.length === 0 ? (
        <p className="mt-4 text-sm text-charcoal/50">Nenhum formulário enviado nesta negociação.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {invites.map((invite) => {
            const filled = invite.status === "submitted";
            const expanded = open === invite._id;
            return (
              <li key={invite._id} className="rounded-xl border border-charcoal/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-charcoal">{invite.formName}</p>
                    <p className="text-xs text-charcoal/50">
                      Código {invite.code} · enviado {formatDateTime(invite.sentAt)}
                      {filled && invite.submittedAt ? ` · preenchido ${formatDateTime(invite.submittedAt)}` : ""}
                    </p>
                  </div>
                  <span className={`chip ${filled ? "bg-sage/15 text-sage" : "bg-gold/15 text-gold"}`}>{filled ? "Preenchido" : "Aguardando"}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {filled ? (
                    <button type="button" className="btn-secondary !py-1.5" onClick={() => setOpen(expanded ? null : invite._id)}>
                      {expanded ? "Ocultar respostas" : "Ver respostas"}
                    </button>
                  ) : (
                    <>
                      <CopyButton text={() => inviteUrl(invite.code)} label="Copiar link" className="btn-secondary !py-1.5" />
                      <CopyButton text={() => message(invite)} label="Copiar mensagem" className="btn-secondary !py-1.5" />
                      {phone ? (
                        <a
                          href={`${whatsappLink(phone)}?text=${encodeURIComponent(message(invite))}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary !py-1.5"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                    </>
                  )}
                </div>
                {filled && expanded ? (
                  <dl className="mt-3 space-y-2">
                    {invite.answers.map((answer) => (
                      <div key={answer.label} className="rounded-lg bg-beige/60 px-3 py-2">
                        <dt className="text-xs font-medium text-charcoal/45">{answer.label}</dt>
                        <dd className="mt-0.5 whitespace-pre-line text-sm text-charcoal">{answer.value || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
