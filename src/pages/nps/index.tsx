import { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { HiOutlineTrash } from "react-icons/hi2";
import SendNpsDialog from "@/components/nps/SendNpsDialog";
import Field from "@/components/tools/Field";
import MetricCard from "@/components/ui/MetricCard";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import { useAsyncData } from "@/hooks/useAsyncData";
import { apiError } from "@/lib/errors";
import { resources } from "@/lib/resources";
import type { NPSSurvey } from "@/types";
import { formatDate } from "@/utils/format";

const EMPTY_SURVEY = {
  name: "",
  question: "Em uma escala de 0 a 10, o quanto você recomendaria a nossa produtora para um amigo ou colega?",
  commentPrompt: "O que motivou a sua nota?",
  thankYouMessage: "Obrigado pela sua resposta. Ela nos ajuda a evoluir.",
  isActive: true,
};

function tone(rating: number) {
  if (rating >= 9) return "bg-sage/15 text-sage";
  if (rating >= 7) return "bg-gold/15 text-gold";
  return "bg-burgundy/10 text-burgundy";
}

export default function NpsPage() {
  const ratingsData = useAsyncData(() => resources.nps.ratings());
  const surveysData = useAsyncData(() => resources.nps.surveys.list());
  const [editing, setEditing] = useState<{ survey: NPSSurvey | null; form: typeof EMPTY_SURVEY } | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [surveyFilter, setSurveyFilter] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const summary = ratingsData.data?.summary;
  const ratings = useMemo(
    () => (ratingsData.data?.ratings || []).filter((item) => !surveyFilter || item.surveyId === surveyFilter),
    [ratingsData.data, surveyFilter],
  );
  const total = (summary?.promoters || 0) + (summary?.passives || 0) + (summary?.detractors || 0);
  const pct = (value = 0) => `${total ? (value / total) * 100 : 0}%`;

  async function handleSave() {
    if (!editing) return;
    if (!editing.form.name.trim() || !editing.form.question.trim()) {
      setFormError("Informe o nome e a pergunta.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      if (editing.survey) await resources.nps.surveys.update(editing.survey._id, editing.form);
      else await resources.nps.surveys.create(editing.form);
      setEditing(null);
      await surveysData.reload();
    } catch (err) {
      setFormError(apiError(err, "Não foi possível salvar a pesquisa."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(survey: NPSSurvey) {
    if (!window.confirm(`Excluir a pesquisa "${survey.name}"? As respostas já recebidas continuam.`)) return;
    await resources.nps.surveys.remove(survey._id);
    await surveysData.reload();
  }

  async function removeRating(id: string) {
    if (!window.confirm("Excluir esta resposta?")) return;
    await resources.nps.removeRating(id);
    await ratingsData.reload();
  }

  return (
    <>
      <Head>
        <title>NPS | Noma</title>
      </Head>
      <PageHeader
        eyebrow="Relacionamento"
        title="NPS"
        description="Crie pesquisas do seu jeito e envie um link único para cada cliente responder."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEditing({ survey: null, form: EMPTY_SURVEY })}>
              Nova pesquisa
            </button>
            <button type="button" className="btn-primary" onClick={() => setSendOpen(true)}>
              Enviar pesquisa
            </button>
          </>
        }
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="NPS" value={String(summary?.score ?? 0)} hint={`${total} respostas`} tone={(summary?.score || 0) >= 50 ? "sage" : (summary?.score || 0) >= 0 ? "gold" : "burgundy"} />
        <MetricCard label="Promotores (9–10)" value={String(summary?.promoters || 0)} tone="sage" />
        <MetricCard label="Neutros (7–8)" value={String(summary?.passives || 0)} tone="gold" />
        <MetricCard label="Detratores (0–6)" value={String(summary?.detractors || 0)} tone="burgundy" />
      </section>

      <div className="card mb-6 p-5">
        <p className="eyebrow mb-3">Distribuição das notas</p>
        <div className="flex h-3 overflow-hidden rounded-full bg-beige">
          <div className="h-full bg-sage" style={{ width: pct(summary?.promoters) }} />
          <div className="h-full bg-gold" style={{ width: pct(summary?.passives) }} />
          <div className="h-full bg-burgundy" style={{ width: pct(summary?.detractors) }} />
        </div>
        <p className="mt-3 text-xs text-charcoal/50">NPS = % de promotores − % de detratores (de −100 a 100).</p>
      </div>

      <section className="card mb-6 overflow-hidden">
        <h2 className="border-b border-charcoal/[0.06] px-5 py-4 text-base font-semibold text-charcoal">Pesquisas</h2>
        {surveysData.isLoading ? (
          <div className="skeleton m-5 h-16" />
        ) : !surveysData.data?.length ? (
          <p className="px-5 py-6 text-sm text-charcoal/50">Crie a primeira pesquisa NPS. Depois é só enviar o link ao cliente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[640px] text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-3 text-left">Pesquisa</th>
                  <th className="px-5 py-3 text-left">Pergunta</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {surveysData.data.map((survey) => (
                  <tr key={survey._id}>
                    <td className="px-5 py-3 font-medium">{survey.name}</td>
                    <td className="max-w-md truncate px-5 py-3 text-charcoal/65">{survey.question}</td>
                    <td className="px-5 py-3">
                      <span className={`chip ${survey.isActive ? "bg-sage/10 text-sage" : "bg-charcoal/5 text-charcoal/50"}`}>
                        {survey.isActive ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          className="text-sm text-tan"
                          onClick={() =>
                            setEditing({
                              survey,
                              form: {
                                name: survey.name,
                                question: survey.question,
                                commentPrompt: survey.commentPrompt,
                                thankYouMessage: survey.thankYouMessage,
                                isActive: survey.isActive,
                              },
                            })
                          }
                        >
                          Editar
                        </button>
                        <button type="button" className="text-sm text-burgundy" onClick={() => void handleDelete(survey)}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/[0.06] px-5 py-4">
          <h2 className="text-base font-semibold text-charcoal">Respostas</h2>
          <select className="input-search !w-auto !py-1.5" value={surveyFilter} onChange={(event) => setSurveyFilter(event.target.value)}>
            <option value="">Todas as pesquisas</option>
            {(surveysData.data || []).map((survey) => (
              <option key={survey._id} value={survey._id}>
                {survey.name}
              </option>
            ))}
          </select>
        </div>
        {ratingsData.isLoading ? (
          <div className="skeleton m-5 h-16" />
        ) : ratings.length === 0 ? (
          <p className="px-5 py-6 text-sm text-charcoal/50">As respostas aparecem aqui quando o cliente preenche o link.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[760px] text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-3 text-left">Contato</th>
                  <th className="px-5 py-3 text-left">Pesquisa</th>
                  <th className="px-5 py-3 text-left">Nota</th>
                  <th className="px-5 py-3 text-left">Comentário</th>
                  <th className="px-5 py-3 text-left">Data</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {ratings.map((rating) => (
                  <tr key={rating._id}>
                    <td className="px-5 py-3">
                      <Link href={`/contatos/${rating.contactId}`} className="font-medium text-charcoal hover:text-tan">
                        {rating.contactName || "Contato"}
                      </Link>
                      {rating.companyName ? <span className="block text-xs text-charcoal/45">{rating.companyName}</span> : null}
                    </td>
                    <td className="px-5 py-3 text-charcoal/65">{rating.surveyName || "Pesquisa"}</td>
                    <td className="px-5 py-3">
                      <span className={`chip ${tone(rating.rating)}`}>{rating.rating}</span>
                    </td>
                    <td className="max-w-sm px-5 py-3 text-charcoal/70">{rating.comment || "—"}</td>
                    <td className="px-5 py-3 text-charcoal/60">{formatDate(rating.date)}</td>
                    <td className="px-5 py-3 text-right">
                      <button type="button" className="btn-ghost h-8 w-8 hover:text-burgundy" aria-label="Excluir resposta" onClick={() => void removeRating(rating._id)}>
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={Boolean(editing)}
        title={editing?.survey ? "Editar pesquisa NPS" : "Nova pesquisa NPS"}
        description="Monte a pergunta e o texto de agradecimento. O cliente só entra na hora de enviar o link."
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => void handleSave()}>
              {busy ? "Salvando..." : editing?.survey ? "Salvar alterações" : "Criar pesquisa"}
            </button>
          </>
        }
      >
        {editing ? (
          <div className="grid gap-4 pt-1">
            <Field label="Nome da pesquisa">
              <input
                className="input-search"
                value={editing.form.name}
                placeholder="Ex.: NPS pós-entrega"
                onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })}
              />
            </Field>
            <Field label="Pergunta" hint="É a pergunta que o cliente vê no link (nota de 0 a 10).">
              <textarea
                className="input-search min-h-[90px] resize-y"
                value={editing.form.question}
                onChange={(e) => setEditing({ ...editing, form: { ...editing.form, question: e.target.value } })}
              />
            </Field>
            <Field label="Pergunta de comentário" hint="Deixe em branco se não quiser campo aberto.">
              <input
                className="input-search"
                value={editing.form.commentPrompt}
                onChange={(e) => setEditing({ ...editing, form: { ...editing.form, commentPrompt: e.target.value } })}
              />
            </Field>
            <Field label="Mensagem de agradecimento">
              <input
                className="input-search"
                value={editing.form.thankYouMessage}
                onChange={(e) => setEditing({ ...editing, form: { ...editing.form, thankYouMessage: e.target.value } })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                checked={editing.form.isActive}
                onChange={(e) => setEditing({ ...editing, form: { ...editing.form, isActive: e.target.checked } })}
              />
              Pesquisa ativa para envio
            </label>
            {formError ? <p className="text-sm text-burgundy">{formError}</p> : null}
          </div>
        ) : null}
      </Modal>

      <SendNpsDialog open={sendOpen} onClose={() => setSendOpen(false)} />
    </>
  );
}
