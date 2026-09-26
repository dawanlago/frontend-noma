import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { apiError } from "@/lib/errors";
import { isInviteCode, resources } from "@/lib/resources";
import type { FormField, PublicFormData } from "@/types";

type PublicForm = PublicFormData;
type Answer = string | string[] | boolean;

function Input({ field, value, onChange }: { field: FormField; value: Answer | undefined; onChange: (value: Answer) => void }) {
  const text = typeof value === "string" ? value : "";
  switch (field.type) {
    case "textarea":
      return <textarea className="input-search min-h-[110px] resize-y" value={text} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case "select":
      return (
        <select className="input-search" value={text} onChange={(e) => onChange(e.target.value)}>
          <option value="">Selecione</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case "multiselect": {
      const list = Array.isArray(value) ? value : [];
      return (
        <div className="grid gap-2">
          {field.options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                checked={list.includes(option)}
                onChange={(e) => onChange(e.target.checked ? [...list, option] : list.filter((item) => item !== option))}
              />
              {option}
            </label>
          ))}
        </div>
      );
    }
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm text-charcoal">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
          {field.placeholder || "Sim"}
        </label>
      );
    default:
      return (
        <input
          className="input-search"
          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={text}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/** Página pública do formulário (sem login). */
export default function PublicFormPage() {
  const router = useRouter();
  const publicId = typeof router.query.publicId === "string" ? router.query.publicId : "";
  const [form, setForm] = useState<PublicForm | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!publicId) return;
    resources.publicForms
      .get(publicId)
      .then((data) => {
        setForm(data);
        // Formulário enviado pela negociação: já vem com o que sabemos do contato.
        if (data.prefill) setAnswers((current) => ({ ...data.prefill, ...current }));
      })
      .catch(() => setError("Este formulário não está disponível."));
  }, [publicId]);

  async function handleSubmit() {
    setIsSending(true);
    setError("");
    try {
      const result = await resources.publicForms.submit(publicId, answers, website);
      setDone(result.message || "Recebemos suas respostas. Obrigado!");
    } catch (err) {
      setError(apiError(err, "Não foi possível enviar. Tente de novo."));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <Head>
        <title>{form ? `${form.name} | Noma` : "Formulário | Noma"}</title>
      </Head>
      <main className="min-h-screen bg-beige px-4 py-10">
        <div className="mx-auto max-w-xl">
          <p className="mb-4 text-center text-sm font-bold tracking-tight text-charcoal">Noma · Produtora audiovisual</p>
          <div className="card p-6 sm:p-8">
            {!form && !error ? <div className="skeleton h-64" /> : null}
            {error && !form ? <p className="text-center text-sm text-burgundy">{error}</p> : null}
            {form && !done && form.status === "submitted" ? (
              <div>
                <p className="eyebrow">Preenchido</p>
                <h1 className="mt-2 text-2xl font-semibold text-charcoal">{form.name}</h1>
                <p className="mt-2 text-sm text-charcoal/55">
                  {form.contactFirstName ? `${form.contactFirstName}, suas` : "Suas"} respostas já foram registradas.
                </p>
                <dl className="mt-6 space-y-3">
                  {(form.answers || []).map((answer) => (
                    <div key={answer.label} className="rounded-xl bg-beige/60 px-4 py-3">
                      <dt className="text-xs font-medium text-charcoal/45">{answer.label}</dt>
                      <dd className="mt-1 whitespace-pre-line text-sm text-charcoal">{answer.value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
            {form && done ? (
              <div className="py-8 text-center">
                <p className="text-xl font-semibold text-charcoal">Enviado!</p>
                <p className="mt-2 whitespace-pre-line text-sm text-charcoal/65">{done}</p>
              </div>
            ) : null}
            {form && !done && form.status !== "submitted" ? (
              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmit();
                }}
              >
                <div>
                  {isInviteCode(publicId) ? <p className="eyebrow mb-1">Código {publicId}</p> : null}
                  {form.contactFirstName ? <p className="mb-1 text-sm text-charcoal/55">Olá, {form.contactFirstName}!</p> : null}
                  <h1 className="text-2xl font-semibold tracking-tight text-charcoal">{form.name}</h1>
                  {form.description ? <p className="mt-2 whitespace-pre-line text-sm text-charcoal/60">{form.description}</p> : null}
                </div>
                {form.fields.map((field) => (
                  <div key={field.key}>
                    <p className="mb-1.5 text-sm font-semibold text-charcoal">
                      {field.label}
                      {field.required ? <span className="text-burgundy"> *</span> : null}
                    </p>
                    <Input field={field} value={answers[field.key]} onChange={(value) => setAnswers((current) => ({ ...current, [field.key]: value }))} />
                  </div>
                ))}
                {/* Campo invisível para barrar robôs. */}
                <input className="hidden" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden />
                {error ? <p className="text-sm text-burgundy">{error}</p> : null}
                <button type="submit" className="btn-primary w-full" disabled={isSending}>
                  {isSending ? "Enviando..." : "Enviar"}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
