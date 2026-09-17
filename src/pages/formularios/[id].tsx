import { FormEvent, useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import LogoMark from "@/components/ui/LogoMark";
import FormField from "@/components/ui/FormField";
import { useAsyncData } from "@/hooks/useAsyncData";
import { resources } from "@/lib/resources";
import type { FormAnswer, FormField as FormFieldConfig } from "@/types";

function isInviteCode(value: string) {
  return /^\d{6}$/.test(value);
}

function answerText(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default function PublicFormPage() {
  const router = useRouter();
  const formId = String(router.query.id || "");
  const inviteMode = isInviteCode(formId);
  const { data, isLoading, error } = useAsyncData(async () => {
    if (!formId) return null;
    if (inviteMode) return resources.forms.invites.public.get(formId);
    const form = await resources.forms.public.get(formId);
    return {
      code: "",
      status: "pending" as const,
      form,
      contactFirstName: "",
      prefill: {} as Record<string, string>,
      answers: [] as FormAnswer[],
    };
  }, [formId, inviteMode]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedAnswers, setSubmittedAnswers] = useState<FormAnswer[]>([]);

  useEffect(() => {
    if (!data?.prefill) return;
    setValues((current) => ({ ...data.prefill, ...current }));
  }, [data]);

  const alreadyFilled = inviteMode && (data?.status === "submitted" || submitted);
  const formName = data?.form?.name || "Formulário";
  const filledAnswers = data?.answers?.length ? data.answers : submittedAnswers;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      if (inviteMode) await resources.forms.invites.public.submit(formId, values);
      else await resources.forms.public.submit(formId, values);
      setSubmittedAnswers(
        (data?.form.fields || []).map((field) => ({
          key: field.key,
          label: field.label,
          type: field.type,
          value: values[field.key] ?? "",
        })),
      );
      setSubmitted(true);
    } catch (respondError) {
      setSubmitError(
        (respondError as { response?: { data?: { error?: string } } }).response?.data?.error ||
          "Não foi possível enviar o formulário.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Head><title>{`${formName} | Noma`}</title></Head>
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="mb-8 flex justify-center">
            <LogoMark size="md" withWordmark />
          </div>
          <div className="card p-7 sm:p-8">
            {isLoading ? (
              <p className="text-sm text-charcoal/50">Carregando formulário...</p>
            ) : error || !data ? (
              <div>
                <h1 className="font-display text-2xl font-semibold text-charcoal">Link inválido</h1>
                <p className="mt-2 text-sm text-charcoal/55">{error || "Este formulário não está disponível."}</p>
              </div>
            ) : alreadyFilled ? (
              <div>
                <p className="eyebrow">Preenchido</p>
                <h1 className="mt-2 font-display text-2xl font-semibold">{formName}</h1>
                <p className="mt-2 text-sm text-charcoal/50">
                  {data.contactFirstName ? `${data.contactFirstName}, suas` : "Suas"} respostas já foram registradas.
                </p>
                {filledAnswers.length ? (
                  <dl className="mt-6 space-y-3">
                    {filledAnswers.map((answer) => (
                      <div key={answer.key} className="rounded-xl bg-beige/50 px-4 py-3">
                        <dt className="text-xs font-medium text-charcoal/45">{answer.label}</dt>
                        <dd className="mt-1 text-sm text-charcoal">{answerText(answer.value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : submitted ? (
                  <p className="mt-4 text-sm text-charcoal/50">Obrigado. Entraremos em contato.</p>
                ) : null}
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <p className="eyebrow">{inviteMode ? `Código ${formId}` : "Qualificação"}</p>
                <h1 className="mt-2 font-display text-2xl font-semibold">{formName}</h1>
                <div className="mt-6">
                  {(data.form.fields || []).map((field) => (
                    <DynamicField
                      key={field.key}
                      field={field}
                      value={values[field.key]}
                      onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
                    />
                  ))}
                </div>
                {submitError ? <p className="mb-3 text-sm text-burgundy">{submitError}</p> : null}
                <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Enviar respostas"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: FormFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "boolean") {
    return (
      <label className="mb-4 flex items-center gap-2 text-sm text-charcoal">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        {field.label}
        {field.required ? " *" : ""}
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <FormField label={`${field.label}${field.required ? " *" : ""}`}>
        <textarea
          className="input-search min-h-[100px]"
          value={String(value || "")}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
        />
      </FormField>
    );
  }

  if (field.type === "select") {
    return (
      <FormField label={`${field.label}${field.required ? " *" : ""}`}>
        <select
          className="input-search"
          value={String(value || "")}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
        >
          <option value="">Selecione</option>
          {field.options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </FormField>
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <FormField label={`${field.label}${field.required ? " *" : ""}`}>
        <div className="space-y-2">
          {field.options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={(event) => {
                  onChange(
                    event.target.checked
                      ? [...selected, option]
                      : selected.filter((item) => item !== option),
                  );
                }}
              />
              {option}
            </label>
          ))}
        </div>
      </FormField>
    );
  }

  const inputType =
    field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : "text";

  return (
    <FormField label={`${field.label}${field.required ? " *" : ""}`}>
      <input
        className="input-search"
        type={inputType}
        value={String(value || "")}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      />
    </FormField>
  );
}
