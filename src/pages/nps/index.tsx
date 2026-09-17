import { FormEvent, useMemo, useState } from "react";
import Head from "next/head";
import FormField from "@/components/ui/FormField";
import ListWorkspace from "@/components/ui/ListWorkspace";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import { formatDate } from "@/utils/format";
import type { NPSSurvey } from "@/types";

const emptySurvey = {
  name: "",
  question: "Em uma escala de 0 a 10, o quanto você nos recomendaria?",
  commentPrompt: "O que motivou a sua nota?",
  thankYouMessage: "Obrigado pela sua resposta. Ela nos ajuda a evoluir.",
  isActive: true,
};

export default function NPSPage() {
  const { data: ratings, isLoading, error } = useAsyncData(() => resources.nps.list());
  const { data: surveys, isLoading: surveysLoading, error: surveysError, reload: reloadSurveys } =
    useAsyncData(() => resources.nps.surveys.list());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NPSSurvey | null>(null);
  const [form, setForm] = useState(emptySurvey);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const promoters = (ratings || []).filter((item) => item.rating >= 9).length;
  const passives = (ratings || []).filter((item) => item.rating >= 7 && item.rating <= 8).length;
  const detractors = (ratings || []).filter((item) => item.rating <= 6).length;

  function openCreate() {
    setEditing(null);
    setForm(emptySurvey);
    setModalOpen(true);
  }

  function openEdit(survey: NPSSurvey) {
    setEditing(survey);
    setForm({
      name: survey.name,
      question: survey.question,
      commentPrompt: survey.commentPrompt || "",
      thankYouMessage: survey.thankYouMessage,
      isActive: survey.isActive,
    });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (editing) {
        await resources.nps.surveys.update(editing._id, form);
      } else {
        await resources.nps.surveys.create(form);
      }
      setModalOpen(false);
      await reloadSurveys();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(survey: NPSSurvey) {
    if (!window.confirm(`Excluir a pesquisa "${survey.name}"?`)) return;
    await resources.nps.surveys.remove(survey._id);
    await reloadSurveys();
  }

  const activeSurveys = useMemo(
    () => (surveys || []).filter((item) => item.isActive).length,
    [surveys],
  );

  return (
    <>
      <Head><title>NPS | Noma CRM</title></Head>
      <PageHeader
        eyebrow="Growth"
        title="NPS"
        description="Crie pesquisas do seu jeito e envie um link único para cada cliente responder."
        actions={
          <button type="button" className="btn-gold" onClick={openCreate}>
            Nova pesquisa
          </button>
        }
      />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Promotores" value={String(promoters)} tone="sage" />
        <MetricCard label="Neutros" value={String(passives)} tone="gold" />
        <MetricCard label="Detratores" value={String(detractors)} tone="burgundy" />
      </section>

      <div className="card mb-6 p-5">
        <p className="eyebrow mb-3">Distribuição das notas</p>
        <div className="flex h-3 overflow-hidden rounded-full bg-beige">
          <div className="h-full bg-sage" style={{ width: `${(promoters / ((ratings || []).length || 1)) * 100}%` }} />
          <div className="h-full bg-gold" style={{ width: `${(passives / ((ratings || []).length || 1)) * 100}%` }} />
          <div className="h-full bg-burgundy" style={{ width: `${(detractors / ((ratings || []).length || 1)) * 100}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-charcoal/50">
          <span>Promotores {promoters}</span>
          <span>Neutros {passives}</span>
          <span>Detratores {detractors}</span>
          <span>{activeSurveys} pesquisas ativas</span>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 font-display text-xl font-semibold tracking-tight text-charcoal">Pesquisas</h2>
        <ListWorkspace
          countLabel={`Existem ${surveys?.length || 0} pesquisas na sua base`}
          columns={["Pesquisa", "Pergunta", "Status", "Ações"]}
          emptyMessage="Crie a primeira pesquisa NPS. Depois é só enviar o link pelo contato."
          isLoading={surveysLoading}
          error={surveysError}
        >
          {(surveys || []).map((survey) => (
            <tr key={survey._id} className="border-t border-charcoal/5">
              <td className="px-4 py-3 font-medium">{survey.name}</td>
              <td className="max-w-sm truncate px-4 py-3 text-charcoal/65">{survey.question}</td>
              <td className="px-4 py-3">
                <span className={`chip ${survey.isActive ? "bg-sage/10 text-sage" : "bg-charcoal/5 text-charcoal/50"}`}>
                  {survey.isActive ? "Ativa" : "Inativa"}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button type="button" className="text-sm text-tan" onClick={() => openEdit(survey)}>Editar</button>
                  <button type="button" className="text-sm text-burgundy" onClick={() => void handleDelete(survey)}>Excluir</button>
                </div>
              </td>
            </tr>
          ))}
        </ListWorkspace>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold tracking-tight text-charcoal">Respostas</h2>
        <ListWorkspace
          countLabel={`Existem ${ratings?.length || 0} respostas na sua base`}
          columns={["Pesquisa", "Contato", "Nota", "Comentário", "Data"]}
          emptyMessage="As respostas aparecem aqui quando o cliente preenche o link."
          isLoading={isLoading}
          error={error}
        >
          {(ratings || []).map((rating) => (
            <tr key={rating._id} className="border-t border-charcoal/5">
              <td className="px-4 py-3">{rating.survey?.name || "Pesquisa"}</td>
              <td className="px-4 py-3">{rating.contact?.name || "Contato"}</td>
              <td className="px-4 py-3 font-semibold">{rating.rating}</td>
              <td className="px-4 py-3">{rating.comment || "—"}</td>
              <td className="px-4 py-3">{formatDate(rating.date)}</td>
            </tr>
          ))}
        </ListWorkspace>
      </section>

      <Modal
        open={modalOpen}
        title={editing ? "Editar pesquisa NPS" : "Nova pesquisa NPS"}
        description="Monte a pergunta e o texto de agradecimento. O cliente só entra na hora de enviar o link."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" form="nps-survey-form" className="btn-gold" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : editing ? "Salvar alterações" : "Criar pesquisa"}
            </button>
          </>
        }
      >
        <form id="nps-survey-form" onSubmit={handleSubmit}>
          <FormField label="Nome da pesquisa">
            <input
              className="input-search"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: NPS pós-onboarding"
              required
            />
          </FormField>
          <FormField label="Pergunta" hint="Essa é a pergunta que o cliente vê no link.">
            <textarea
              className="input-search min-h-[90px]"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Pergunta de comentário" hint="Deixe em branco se não quiser campo aberto.">
            <input
              className="input-search"
              value={form.commentPrompt}
              onChange={(e) => setForm({ ...form, commentPrompt: e.target.value })}
              placeholder="O que motivou a sua nota?"
            />
          </FormField>
          <FormField label="Mensagem de agradecimento">
            <input
              className="input-search"
              value={form.thankYouMessage}
              onChange={(e) => setForm({ ...form, thankYouMessage: e.target.value })}
              required
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Pesquisa ativa para envio
          </label>
        </form>
      </Modal>
    </>
  );
}
